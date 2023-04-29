import { TxOutput } from "liquidjs-lib";

export type NetworkString = "liquid" | "testnet" | "regtest";
export interface Outpoint {
  txid: string;
  vout: number;
}
export type Output = Outpoint & {
  prevout: TxOutput;
};

export interface ElectrumUnspent {
  script(script: any, arg1: string): Buffer;
  height: number;
  tx_hash: string;
  tx_pos: number;
  value: number;
}

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

export const esploraUIForNetwork = (network: NetworkString) => {
  switch (network) {
    case "regtest":
      return "http://localhost:5001";
    case "testnet":
      return "https://liquid.network/testnet";
    default:
      return "https://liquid.network";
  }
};

export const esploraAPIForNetwork = (network: NetworkString) => {
  switch (network) {
    case "regtest":
      return "http://localhost:3001";
    case "testnet":
      return "https://liquid.network/liquidtestnet/api";
    default:
      return "https://liquid.network/api";
  }
};
