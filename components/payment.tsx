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
  ReverseSwap,
} from "../lib/swaps/submarineSwap";
import { ElectrumWS } from "../lib/electrum";
import { sleep } from "../lib/utils";

interface PaymentProps {
  publicKey: Buffer;
  network: NetworkString;
  sats: number;
  onSuccess: (utxos: Output[], preimage: Buffer, redeemScript: Buffer) => void;
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
  const [invoice, setInvoice] = useState<string>("");
  const [stage, setStage] = useState<Stage>(Stage.FETCHING_INVOICE);
  const [buttonText, setButtonText] = useState("Copy");

  const handleCopy = () => {
    navigator.clipboard.writeText(invoice).then(
      () => {
        setButtonText("📋 Copied");
        sleep(3000).then(() => setButtonText("Copy"));
      },
      (err) => console.error("Could not copy text: ", err),
    );
  };

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

        const { invoice, lockupAddress, redeemScript, preimage } = boltzSwap;

        console.log(lockupAddress);
        setStage(Stage.AWAITING_PAYMENT);
        setInvoice(invoice);

        // prepare timeout handler
        const invoiceExpireDate = Number(getInvoiceExpireDate(invoice));
        const invoiceExpirationTimeout = setTimeout(() => {
          throw new Error("invoice expired");
        }, invoiceExpireDate - Date.now());

        const electrum = new ElectrumWS(electrumURLForNetwork(network));

        electrum.notifyPayments(lockupAddress, async (utxos: Output[]) => {
          // setStage
          setStage(Stage.PAID);

          // give time to see the screen transition
          await sleep(1000);

          // onSuccess
          onSuccess(utxos, preimage, Buffer.from(redeemScript, "hex"));

          // clear-up
          clearTimeout(invoiceExpirationTimeout);
        });
      } catch (err: any) {
        // setStage
        setStage(Stage.FAILURE);

        console.error(err);
        onFailure(err);
      }
    })();

    return () => {};
  }, [network, sats, publicKey, onFailure, onSuccess]);

  const renderContent = () => {
    switch (stage) {
      case Stage.FETCHING_INVOICE:
        return <p className="subtitle">Loading invoice...</p>;
      case Stage.AWAITING_PAYMENT:
        return (
          <>
            <h1 className="title">Deposit with ⚡️Lightning Network</h1>
            <p className="subtitle">Awaiting payment...</p>
            <QRCode text={invoice} />
            <p className="has-text-centered mt-4">
              <button onClick={handleCopy} className="button">
                {buttonText}
              </button>
            </p>
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
