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

export const electrumURLForNetwork = (network: NetworkString) => {
  switch (network) {
    case "regtest":
      return "http://localhost:3001"; // TODO
    case "testnet":
      return "wss://esplora.blockstream.com/liquidtestnet/electrum-websocket/api";
    default:
      return "wss://esplora.blockstream.com/liquid/electrum-websocket/api";
  }
};

export const esploraURLForNetwork = (network: NetworkString) => {
  switch (network) {
    case "regtest":
      return "http://localhost:3001";
    case "testnet":
      return "https://liquid.network/liquidtestnet/api";
    default:
      return "https://liquid.network/api";
  }
};
