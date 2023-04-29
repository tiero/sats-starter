import { ECPairInterface } from "ecpair";
import * as ecc from "tiny-secp256k1";
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
  address,
  networks,
  witnessStackToScriptWitness,
  Secp256k1Interface
} from "liquidjs-lib";
import { Output } from "./constants";
import { Contract } from "@ionio-lang/ionio";

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


export async function goalReached(contract: Contract, utxos: Output[]) {
  const goal = contract.contractParameters.goal as number;
  const beneficiaryProgram = contract.contractParameters.beneficiaryProgram as string;

  const tx = contract.functions.goalReached();

  for (const utxo of utxos) {
    tx.withUtxo(utxo);
  }

  const beneficiaryScript = script.compile([
    script.OPS.OP_0,
    Buffer.from(beneficiaryProgram, "hex"),
  ]);
  const beneficiaryAddress = address.fromOutputScript(beneficiaryScript, networks.testnet);

  tx.withRecipient(beneficiaryAddress, goal);
  
  await tx.unlock();

  return tx.toHex();
}
