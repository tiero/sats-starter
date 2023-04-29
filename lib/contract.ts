import secp256k1 from "@vulpemventures/secp256k1-zkp";
import * as ecc from "tiny-secp256k1";
import { Argument, Artifact, Contract } from "@ionio-lang/ionio";
import { Secp256k1Interface, networks } from "liquidjs-lib";
import crowdfunding from "./crowdfunding.json";

export async function buildDepositContract(
  params: {[name: string]: Argument},
  network: networks.Network = networks.testnet,
): Promise<{ contract: Contract, zkp: Secp256k1Interface }> {
  const zkp = await secp256k1();
  // re-order as an array of arguments comparing the crowdfunding.contractParams definition and the name of the params object
  let constructorInputs = [];
  for (const input of (crowdfunding as Artifact).constructorInputs) {
    constructorInputs.push(params[input.name]);
  }
  const contract = new Contract(
    crowdfunding as Artifact,
    constructorInputs,
    network,
    zkp,
  );
  return { contract, zkp };
}
