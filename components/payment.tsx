import { randomBytes } from "crypto";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import { crypto, address, networks } from "liquidjs-lib";
import { useEffect, useState } from "react";
import QRCode from "./qrcode";
import { feeAmount, NetworkString, Outpoint } from "../lib/constants";
import {
  createReverseSubmarineSwap,
  getInvoiceExpireDate,
  ReverseSwap,
} from "../lib/swaps/submarineSwap";
import { ElectrumWS, electrumURL, esploraURL } from "../lib/electrum";
import { sleep } from "../lib/utils";

interface PaymentProps {
  network: NetworkString;
  sats: number;
  onSuccess: () => void;
  onFailure: (err: string) => void;
}

enum Stage {
  FETCHING_INVOICE,
  AWAITING_PAYMENT,
  PAID,
  FAILURE,
}

export default function Payment({
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
        setButtonText("✅ Copied");
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

        //TODO use random key
        //const privateKey = randomBytes(32);
        //const keyPair = ECPairFactory(ecc).fromPrivateKey(privateKey);

        const ECPair = ECPairFactory(ecc);
        const keyPair = ECPair.fromPrivateKey(
          Buffer.from(
            "e36451789f29cdd2e4dcd44c2c9f8d7cd8c869b862d2a283c0860b9484b5adef",
            "hex",
          ),
          { network: networks[network] },
        );

        // add the L-BTC sats amount needed for claiming the boltz coin to lock into the covenant
        const onchainAmount = sats + feeAmount;

        const boltzSwap: ReverseSwap | undefined =
          await createReverseSubmarineSwap(
            keyPair.publicKey,
            network,
            onchainAmount,
          );

        if (!boltzSwap) {
          //TODO save used keys on storage
          throw new Error("Error creating swap");
        }

        const { invoice, lockupAddress } = boltzSwap;

        console.log(lockupAddress);
        setInvoice(invoice);
        setStage(Stage.AWAITING_PAYMENT);

        // prepare timeout handler
        const invoiceExpireDate = Number(getInvoiceExpireDate(invoice));
        const invoiceExpirationTimeout = setTimeout(() => {
          throw new Error("invoice expired");
        }, invoiceExpireDate - Date.now());

        const electrum = new ElectrumWS(
          electrumURL(network),
          esploraURL(network),
        );
        electrum.notifyPayment(
          {
            address: lockupAddress,
            amount: onchainAmount,
            assetID: networks[network].assetHash,
          },
          (utxos: any) => {
            console.log(utxos);

            // setStage
            setStage(Stage.PAID);

            // onSuccess
            onSuccess();

            // clear-up
            clearTimeout(invoiceExpirationTimeout);
          },
        );
      } catch (err: any) {
        // setStage
        setStage(Stage.FAILURE);

        console.error(err);
        onFailure(err);
      }
    })();

    return () => {};
  }, [network, sats, onFailure, onSuccess]);

  const renderContent = () => {
    switch (stage) {
      case Stage.FETCHING_INVOICE:
        return <p className="subtitle">Loading invoice...</p>;
      case Stage.AWAITING_PAYMENT:
        return (
          <>
            <h1 className="title">Pay by scanning the QR Code</h1>
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
