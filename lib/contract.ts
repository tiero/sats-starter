import secp256k1 from "@vulpemventures/secp256k1-zkp";
import * as ecc from "tiny-secp256k1";
import { Artifact, Contract } from "@ionio-lang/ionio";
import { networks, payments } from "liquidjs-lib";
import crowdfunding from "./crowdfunding.json";

export async function buildDepositContract(
  donorPublicKey: Buffer,
  beneficiaryScriptPubKey: Buffer,
  satsGoal: number,
  timeframe: {
    startBlock: number;
    endBlock: number;
  },
  network: networks.Network,
): Promise<Contract> {
  const zkp = await secp256k1();


  const contract = new Contract(
    crowdfunding as Artifact,
    [
      timeframe.startBlock,
      timeframe.endBlock,
      satsGoal, //200k sats
      network.assetHash, // L-BTC only
      beneficiaryScriptPubKey.subarray(2),
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
