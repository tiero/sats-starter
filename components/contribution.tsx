import { MouseEventHandler, useState } from "react";
import { fiatToSatoshis } from "bitcoin-conversion";
import {
  Pset,
  Creator,
  Updater,
  Signer,
  Finalizer,
  Extractor,
  ElementsValue,
  Transaction,
  BIP174SigningData,
  script,
  networks,
  witnessStackToScriptWitness,
} from "liquidjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";

import Payment from "./payment";
import { Output } from "../lib/constants";
import { buildDepositContract } from "../lib/contract";

interface ContributionProps {
  title: string;
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
  RESULT,
}

const sizeToAmount = {
  [Size.TO_BE_SELECTED]: 0,
  [Size.SMALL]: 15,
  [Size.MEDIUM]: 50,
  [Size.LARGE]: 100,
};

export default function Contribution({ onCancel, title }: ContributionProps) {
  //TODO use random key
  //const privateKey = randomBytes(32);
  //const keyPair = ECPairFactory(ecc).fromPrivateKey(privateKey);

  const currentNetworkString = "testnet";
  const network = networks[currentNetworkString];

  const ECPair = ECPairFactory(ecc);
  const keyPair = ECPair.fromPrivateKey(
    Buffer.from(
      "e36451789f29cdd2e4dcd44c2c9f8d7cd8c869b862d2a283c0860b9484b5adef",
      "hex",
    ),
  );

  const [sats, setSats] = useState<number>(0);
  const [size, setSize] = useState<Size>(Size.TO_BE_SELECTED);
  const [stage, setStage] = useState<Stage>(Stage.FORM);

  const onSizeChange = async (size: Size) => {
    const sats = await fiatToSatoshis(sizeToAmount[size], "USD");
    setSats(parseInt(sats.toString()));
    setSize(size);
  };

  const onPaymentSuccesful = async (
    utxos: Output[],
    preimage: Buffer,
    redeemScript: Buffer,
  ) => {
    if (utxos.length <= 0) return;
    const fee = 500;
    const [utxo] = utxos;
    const amountMinusFee =
      ElementsValue.fromBytes(utxo.prevout.value).number - fee;

    // Build contaract
    const contract = await buildDepositContract(
      keyPair.publicKey,
      500000,
      {
        startBlock: 598350,
        endBlock: 598360,
      },
      network,
    );

    const pset = Creator.newPset();
    const sighashType = Transaction.SIGHASH_ALL;

    const updater = new Updater(pset);
    updater.addInputs([
      {
        txid: utxo.txid,
        txIndex: utxo.vout,
        witnessUtxo: utxo.prevout,
        sighashType,
      },
    ]);

    const inputIndex = 0;
    updater.addInWitnessScript(inputIndex, redeemScript);

    updater.addOutputs([
      {
        script: contract.scriptPubKey,
        asset: network.assetHash,
        amount: amountMinusFee,
      },
      {
        asset: network.assetHash,
        amount: fee,
      },
    ]);

    const signer = new Signer(pset);

    const inputPreimage = pset.getInputPreimage(inputIndex, sighashType);
    const signature = script.signature.encode(
      keyPair.sign(inputPreimage),
      sighashType,
    );
    const partialSig: BIP174SigningData = {
      partialSig: {
        pubkey: keyPair.publicKey,
        signature,
      },
    };
    signer.addSignature(inputIndex, partialSig, Pset.ECDSASigValidator(ecc));

    if (!pset.validateAllSignatures(Pset.ECDSASigValidator(ecc))) {
      throw new Error("Failed to sign transaction");
    }

    const finalizer = new Finalizer(pset);
    finalizer.finalizeInput(inputIndex, (index, pset) => {
      return {
        finalScriptWitness: witnessStackToScriptWitness([
          signature,
          preimage,
          redeemScript,
        ]),
      };
    });
    console.log(Extractor.extract(pset).toHex());
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
