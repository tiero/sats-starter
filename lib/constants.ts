import { TxOutput } from "liquidjs-lib";

export type NetworkString = "liquid" | "testnet" | "regtest";
export interface Outpoint {
  txid: string;
  vout: number;
}
export type Output = Outpoint & {
  prevout: TxOutput;
};
export type EsploraUtxo = Outpoint & {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
  valuecommitment: string;
  assetcommitment: string;
  noncecommitment: string;
};

export const feeAmount = 500; // fee for regular liquid tx
export const swapFeeAmount = 500; // fee for Boltz
