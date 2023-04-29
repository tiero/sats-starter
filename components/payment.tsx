import { useEffect, useState } from "react";
import QRCode from "./qrcode";
import {
  feeAmount,
  NetworkString,
  electrumURLForNetwork,
  Output,
} from "../lib/constants";
import {
  createReverseSubmarineSwap,
  getInvoiceExpireDate,
  notifyWhenInMempoool,
  ReverseSwap,
} from "../lib/swaps/submarineSwap";
import { sleep } from "../lib/utils";
import { ElectrumWS } from "ws-electrumx-client";
import { ElectrumUnspent } from "../lib/constants";
import * as liquid from "liquidjs-lib";

function scriptHash(address: string) {
  const reversedAddressScriptHash = liquid.crypto
    .sha256(liquid.address.toOutputScript(address))
    .reverse()
    .toString("hex");
  return reversedAddressScriptHash;
}

interface PaymentProps {
  publicKey: Buffer;
  network: NetworkString;
  sats: number;
  onSuccess: (utxo: Output, preimage: Buffer, redeemScript: Buffer) => void;
  onFailure: (err: string) => void;
}

enum Stage {
  FETCHING_INVOICE,
  AWAITING_PAYMENT,
  PAID,
  FAILURE,
}

export default function Payment({
  publicKey,
  network,
  sats,
  onSuccess,
  onFailure,
}: PaymentProps) {
  const [swap, setSwap] = useState<ReverseSwap | null>(null);
  const [stage, setStage] = useState<Stage>(Stage.FETCHING_INVOICE);
  const [buttonText, setButtonText] = useState("Copy");

  const handleCopy = () => {
    if (!swap) return;
    navigator.clipboard.writeText(swap.invoice).then(
      () => {
        setButtonText("📋 Copied");
        sleep(3000).then(() => setButtonText("Copy"));
      },
      (err) => console.error("Could not copy text: ", err),
    );
  };

  const handleSkip = () => {
    if (!swap) return;
    proceedToNextStep(swap);
  };


  const proceedToNextStep = async (boltzSwap: ReverseSwap) => {
    const { lockupAddress, redeemScript, preimage, id } = boltzSwap;
    
    // fetch unspents
    const electrum = new ElectrumWS(electrumURLForNetwork(network));
    
    let unspents: ElectrumUnspent[]  = [];
    while (unspents.length !== 1) {
      await sleep(1000);
      unspents = await electrum.request("blockchain.scripthash.listunspent", scriptHash(lockupAddress)) as ElectrumUnspent[];
    }
    const [unspent] = unspents;

    const txhex = await electrum.request("blockchain.transaction.get", unspent.tx_hash) as string;
    const tx = liquid.Transaction.fromHex(txhex);
    const prevout = tx.outs[unspent.tx_pos];
    
    const utxo: Output = {
      txid: unspent.tx_hash,
      vout: unspent.tx_pos,
      prevout,
    };
    // onSuccess
    onSuccess(utxo, preimage, Buffer.from(redeemScript, "hex"));

    // setStage
    setStage(Stage.PAID);
  }

  useEffect(() => {
    (async () => {
      try {
        // we will create a ephemeral key pair:
        // - it will generate a public key to be used with the Boltz swap
        // - later we will sign the claim transaction with the private key
        // all swaps are stored on storage and available to backup
        // add the L-BTC sats amount needed for claiming the boltz coin to lock into the covenant
        const onchainAmount = sats + feeAmount;

        const boltzSwap: ReverseSwap | undefined =
          await createReverseSubmarineSwap(publicKey, network, onchainAmount);

        if (!boltzSwap) {
          //TODO save used keys on storage
          throw new Error("Error creating swap");
        }

        // prepare timeout handler
        const invoiceExpireDate = Number(getInvoiceExpireDate(boltzSwap.invoice));
        const invoiceExpirationTimeout = setTimeout(() => {
          throw new Error("invoice expired");
        }, invoiceExpireDate - Date.now());


        // update state
        setSwap(boltzSwap);
        setStage(Stage.AWAITING_PAYMENT);

        // subscribe to swap status
        await notifyWhenInMempoool(boltzSwap.id, network, () => {
          // clear-up
          clearTimeout(invoiceExpirationTimeout);
          // next
          proceedToNextStep(boltzSwap)
        });
      } catch (err: any) {
        // setStage
        setStage(Stage.FAILURE);

        console.error(err);
        onFailure(err);
      }
    })();

    return () => { };
  }, [network, sats, publicKey, onFailure, onSuccess]);

  const renderContent = () => {
    if (!swap) return null;
    switch (stage) {
      case Stage.FETCHING_INVOICE:
        return <p className="subtitle">Loading invoice...</p>;
      case Stage.AWAITING_PAYMENT:
        return (
          <>
            <h1 className="title">Deposit with ⚡️Lightning Network</h1>
            <p className="subtitle">Awaiting payment...</p>
            <QRCode text={swap.invoice} />
            <div className="buttons mt-4 is-centered">
              <button onClick={handleCopy} className="button is-primary">
                {buttonText}
              </button>
              <button onClick={handleSkip} className="button">
                Skip
              </button>
            </div>
            
          </>
        );
      case Stage.PAID:
        return <p className="subtitle">✅ Payment succesful!</p>;
      case Stage.FAILURE:
        return (
          <p className="subtitle">😑 Something went wrong. Try again later</p>
        );
      default:
        break;
    }
  };

  return (
    <div className="container">
      <div className="content has-text-centered">{renderContent()}</div>
    </div>
  );
}
