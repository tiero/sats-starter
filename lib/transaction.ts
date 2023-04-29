import { ECPairInterface } from "ecpair";
import {
  Pset,
  Creator,
  Updater,
  UpdaterOutput,
  Signer,
  Finalizer,
  Extractor,
  Transaction,
  BIP174SigningData,
  script,
  witnessStackToScriptWitness,
  Secp256k1Interface,
} from "liquidjs-lib";
import { Output } from "./constants";

export function spendHTLCSwap({
  utxo,
  redeemScript,
  recipients,
  preimage,
  keyPair,
  zkp,
}: {
  utxo: Output;
  recipients: UpdaterOutput[];
  redeemScript: Buffer;
  preimage: Buffer;
  keyPair: ECPairInterface;
  zkp: Secp256k1Interface;
}) {
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

  updater.addOutputs(recipients);

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
  signer.addSignature(inputIndex, partialSig, Pset.ECDSASigValidator(zkp.ecc));

  if (!pset.validateAllSignatures(Pset.ECDSASigValidator(zkp.ecc))) {
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
  return Extractor.extract(pset).toHex();
}
