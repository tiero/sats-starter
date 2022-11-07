import { EsploraUtxo, NetworkString, Outpoint, Output } from "./constants";
import { sleep } from "./utils";
import {
  networks,
  crypto,
  address as laddress,
  Transaction,
} from "liquidjs-lib";

interface PaymentToWatch {
  address: string;
  amount: number;
  assetID: string;
}

export class ElectrumWS {
  constructor(private wsEndpoint: string, private httpEndpoint: string) {}

  notifyPayment(
    { address }: PaymentToWatch,
    callback: (utxos: Outpoint[]) => void,
  ): void {
    // open web socket
    const ws = new WebSocket(this.wsEndpoint);

    // electrum expects the hash of address script in hex reversed
    const reversedAddressScriptHash = crypto
      .sha256(laddress.toOutputScript(address))
      .reverse()
      .toString("hex");

    // send message to subscribe to event
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          id: 1,
          method: "blockchain.scripthash.subscribe",
          params: [reversedAddressScriptHash],
        }),
      );
    };

    // wait for payment
    ws.onmessage = async () => {
      const http = new ElectrumHTTP(this.httpEndpoint);
      const utxos = await http.fetchUtxos(address);
      // payment has arrived
      if (utxos.length > 0) {
        // unsubscribe to event
        ws.send(
          JSON.stringify({
            id: 1,
            method: "blockchain.scripthash.unsubscribe",
            params: [reversedAddressScriptHash],
          }),
        );
        // close socket
        ws.close();

        // notify for succesful payment
        callback(utxos);
      }
    };
  }

  async broadcastTx(rawHex: string): Promise<any> {
    let data;
    // broadcast transaction
    const ws = new WebSocket(this.wsEndpoint);
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          id: 1,
          method: "blockchain.transaction.broadcast",
          params: [rawHex],
        }),
      );
    };
    ws.onmessage = (e) => {
      ws.close();
      data = JSON.parse(e.data);
    };
    while (!data) {
      await sleep(1000);
    }
    return data;
  }
}

export class ElectrumHTTP {
  constructor(private baseURL: string) {}

  async fetchTxHex(txId: string): Promise<string> {
    const res = await fetch(`${this.baseURL}/tx/${txId}/hex`);
    if (!res.ok) {
      const errorMessage = await res.text();
      throw new Error(`${res.statusText}: ${errorMessage}`);
    }
    return await res.json();
  }

  async outpointToUtxo(outpoint: Outpoint): Promise<Output> {
    const prevoutHex: string = await this.fetchTxHex(outpoint.txid);
    const prevout = Transaction.fromHex(prevoutHex).outs[outpoint.vout];
    return { ...outpoint, prevout };
  }

  async fetchUtxos(address: string): Promise<Output[]> {
    const url = `${this.baseURL}/address/${address}/utxo`;

    let esploraUtxos: EsploraUtxo[];
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const errorMessage = await res.text();
        throw new Error(`${res.statusText}: ${errorMessage}`);
      }
      esploraUtxos = await res.json();

      return Promise.all(esploraUtxos.map(this.outpointToUtxo));
    } catch (err: any) {
      throw err;
    }
  }
}

export const electrumURL = (network: NetworkString) => {
  switch (network) {
    case "regtest":
      return "http://localhost:3001"; // TODO
    case "testnet":
      return "wss://esplora.blockstream.com/liquidtestnet/electrum-websocket/api";
    default:
      return "wss://esplora.blockstream.com/liquid/electrum-websocket/api";
  }
};

export const esploraURL = (network: NetworkString) => {
  switch (network) {
    case "regtest":
      return "http://localhost:3001";
    case "testnet":
      return "https://liquid.network/liquidtestnet/api";
    default:
      return "https://liquid.network/api";
  }
};
