import { MouseEventHandler, useState } from "react";
import { fiatToSatoshis } from "bitcoin-conversion";
import { ElementsValue, networks, script } from "liquidjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";

import Payment from "./payment";
import {
  electrumURLForNetwork,
  esploraUIForNetwork,
  Output,
} from "../lib/constants";
import crowdfunding from "../lib/crowdfunding.json";
import { spendHTLCSwap } from "../lib/transaction";
import { ElectrumWS } from "ws-electrumx-client";
import { sleep } from "../lib/utils";
import { addProjectToStore, addScriptToStore } from "../lib/storage";
import { randomBytes } from "crypto";
import { Artifact, Contract } from "@ionio-lang/ionio";
import { buildDepositContract } from "../lib/contract";

interface ContributionProps {
  title: string;
  beneficiary: string;
  timeframe: {
    endBlock: number;
    claimBlock: number;
  };
  goal: number;
  onCancel: MouseEventHandler;
}

enum Size {
  TO_BE_SELECTED,
  SMALL,
  MEDIUM,
  LARGE,
}

enum Stage {
  FORM,
  INVOICE,
  FUNDING_CONTRACT,
  FUNDED,
  FAILURE,
}

const sizeToAmount = {
  [Size.TO_BE_SELECTED]: 0,
  [Size.SMALL]: 15,
  [Size.MEDIUM]: 50,
  [Size.LARGE]: 100,
};

export default function Contribution({
  onCancel,
  beneficiary,
  title,
  timeframe,
  goal,
}: ContributionProps) {
  const privateKey = randomBytes(32);
  const keyPair = ECPairFactory(ecc).fromPrivateKey(privateKey);

  const currentNetworkString = "testnet";
  const network = networks[currentNetworkString];

  const [sats, setSats] = useState<number>(0);
  const [txid, setTxid] = useState<string>("");
  const [size, setSize] = useState<Size>(Size.TO_BE_SELECTED);
  const [stage, setStage] = useState<Stage>(Stage.FORM);

  const onSizeChange = async (size: Size) => {
    const sats = await fiatToSatoshis(sizeToAmount[size], "USD");
    setSats(parseInt(sats.toString()));
    setSize(size);
  };

  const onPaymentSuccesful = async (
    utxo: Output,
    preimage: Buffer,
    redeemScript: Buffer,
  ) => {
    // move to next stage
    setStage(Stage.FUNDING_CONTRACT);

    // give time to see the screen transition
    await sleep(1000);

    const fee = 500;
    const amountMinusFee =
      ElementsValue.fromBytes(utxo.prevout.value).number - fee;



    // contract parameters
    const contractParams = {
      endBlock: timeframe.endBlock,
      claimBlock: timeframe.claimBlock,
      goal: goal,
      fundingAsset: network.assetHash,
      beneficiaryProgram: Buffer.from(beneficiary, 'hex').subarray(2),
      donorPublicKey: keyPair.publicKey.subarray(1),
    }


    // Build contaract
    const {zkp,contract} = await buildDepositContract(contractParams); 

    // spend the HTLC swap to fund the contract
    const rawHex = spendHTLCSwap({
      keyPair,
      zkp,
      utxo,
      redeemScript,
      preimage,
      recipients: [
        {
          script: script.compile([
            script.OPS.OP_RETURN,
            Buffer.from(`sats-starter|${title}`, "utf-8"),
          ]),
          asset: network.assetHash,
          amount: 0,
        },
        {
          script: contract.scriptPubKey,
          asset: network.assetHash,
          amount: amountMinusFee,
        },
        {
          asset: network.assetHash,
          amount: fee,
        },
      ],
    });

    // broadcast transaction
    try {
      const electrum = new ElectrumWS(
        electrumURLForNetwork(currentNetworkString),
      );
      const txid = await electrum.request("blockchain.transaction.broadcast", rawHex) as string;

      // setStage to success
      setStage(Stage.FUNDED);
      setTxid(txid);

      // save to storage
      addProjectToStore({
        title,
        contribution: {
          sats,
          txid,
          privateKey: keyPair.privateKey!.toString("hex"),
          scriptHex: contract.scriptPubKey.toString("hex"),
        },
      });

      // save script params to be used for claim
      addScriptToStore(contract.scriptPubKey.toString("hex"), contract.contractParameters);

    } catch (err: any) {
      // setStage to failure
      setStage(Stage.FAILURE);

      console.error(err);
      console.debug(rawHex);
    }
  };

  const renderContent = () => {
    switch (stage) {
      case Stage.FORM:
        return renderForm();
      case Stage.INVOICE:
        return (
          <Payment
            publicKey={keyPair.publicKey}
            sats={sats}
            network={currentNetworkString}
            onFailure={console.error}
            onSuccess={onPaymentSuccesful}
          />
        );
      case Stage.FUNDING_CONTRACT:
        return (
          <div className="container">
            <div className="content has-text-centered">
              <p className="subtitle">🚜 Funding contract...</p>
            </div>
          </div>
        );
      case Stage.FUNDED:
        return (
          <div className="container">
            <div className="content has-text-centered">
              <p className="subtitle">🎉 Contract has been funded!</p>
              <p className="subtitle is-6">
                🔭 Open in{" "}
                <a
                  href={`${esploraUIForNetwork(
                    currentNetworkString,
                  )}/tx/${txid}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  explorer
                </a>
              </p>
            </div>
          </div>
        );
      case Stage.FAILURE:
        return (
          <p className="subtitle">😑 Something went wrong. Try again later</p>
        );
      default:
        return <></>;
    }
  };

  const renderForm = () => {
    return (
      <div className="container">
        <div className="buttons are-medium">
          <button className="button" onClick={() => onSizeChange(Size.SMALL)}>
            💸 ${sizeToAmount[Size.SMALL]}
          </button>
          <button className="button" onClick={() => onSizeChange(Size.MEDIUM)}>
            💰 ${sizeToAmount[Size.MEDIUM]}
          </button>
          <button className="button" onClick={() => onSizeChange(Size.LARGE)}>
            🤑 ${sizeToAmount[Size.LARGE]}
          </button>
        </div>
        <div className="content">
          <div className="columns is-vcentered">
            <div className="column">
              <h1 className="title">Total ${sizeToAmount[size]}</h1>
              <p className="subtitle">{sats} sats</p>
            </div>
          </div>
        </div>
        <hr />
        <div className="buttons are-medium mt-4">
          <button
            className="button is-primary"
            onClick={() => setStage(Stage.INVOICE)}
          >
            Fund
          </button>
          <button className="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="modal is-active">
      <div className="modal-background" />
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Contribute to {title}</p>
        </header>
        <section className="modal-card-body">{renderContent()}</section>
      </div>
      <button
        className="modal-close is-large"
        aria-label="close"
        onClick={onCancel}
      ></button>
    </div>
  );
}
