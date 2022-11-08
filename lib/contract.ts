import secp256k1 from "@vulpemventures/secp256k1-zkp";
import * as ecc from "tiny-secp256k1";
import { ECPairFactory } from "ecpair";
import { Artifact, Contract } from "@ionio-lang/ionio";
import { networks, payments } from "liquidjs-lib";
import crowdfunding from "./crowdfunding.json";

const ECPair = ECPairFactory(ecc);
const beneficiaryPrivateKey =
  "be945b04e35608be9db21b90f34023ffb87ae9c7a1ef125e091cd93f3f553878";

export async function buildDepositContract(
  donorPublicKey: Buffer,
  satsGoal: number,
  timeframe: {
    startBlock: number;
    endBlock: number;
  },
  network: networks.Network,
): Promise<Contract> {
  const zkp = await secp256k1();
  const beneficiaryKeyPair = ECPair.fromPrivateKey(
    Buffer.from(beneficiaryPrivateKey, "hex"),
    { network },
  );
  const beneficiary = payments.p2wpkh({
    pubkey: beneficiaryKeyPair.publicKey,
    network,
  });

  const contract = new Contract(
    crowdfunding as Artifact,
    [
      timeframe.startBlock,
      timeframe.endBlock,
      satsGoal, //200k sats
      network.assetHash, // L-BTC only
      beneficiary.output!.subarray(2),
      donorPublicKey.subarray(1),
    ],
    network,
    {
      ecc,
      zkp,
    },
  );

  return contract;
}
