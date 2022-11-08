import { NetworkString, Outpoint, Output } from "./constants";
import { sleep } from "./utils";
import {
  ElementsValue,
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
  constructor(private wsEndpoint: string) {}

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
    ws.onmessage = async (ev: any) => {
      console.log(ev);

      //skip malformed messages
      if (!ev || !ev.data) return;

      const data = JSON.parse(ev.data);

      // check for subscribe RPC notification
      if (data.method && data.method === "blockchain.scripthash.subscribe") {
        ws.send(
          JSON.stringify({
            id: 2,
            method: "blockchain.scripthash.listunspent",
            params: [reversedAddressScriptHash],
          }),
        );
      }

      // check for get_balance response
      if (data.id && data.id === 2) {
        // check for sats amount
        const unspents = data.result;
        if (Array.isArray(unspents) && unspents.length > 0) {
          // unsubscribe the socket
          ws.send(
            JSON.stringify({
              id: 3,
              method: "blockchain.scripthash.unsubscribe",
              params: [reversedAddressScriptHash],
            }),
          );

          // close socket
          ws.close();

          // notify for succesful payment
          callback(data.result);
        }
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
  constructor(private httpEndpoint: string) {}

  async fetchTxHex(txId: string): Promise<string> {
    const res = await fetch(`${this.httpEndpoint}/tx/${txId}/hex`);
    if (!res.ok) {
      const errorMessage = await res.text();
      throw new Error(`${res.statusText}: ${errorMessage}`);
    }
    return await res.json();
  }

  async outpointToUtxo(outpoint: Outpoint): Promise<Output> {
    console.log(outpoint);
    const prevoutHex: string = await this.fetchTxHex(outpoint.txid);
    const prevout = Transaction.fromHex(prevoutHex).outs[outpoint.vout];
    return { ...outpoint, prevout };
  }

  async fetchUtxos(address: string): Promise<Output[]> {
    const url = `${this.httpEndpoint}/address/${address}/utxo`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        const errorMessage = await res.text();
        throw new Error(`${res.statusText}: ${errorMessage}`);
      }
      const esploraUtxos = await res.json();

      return Promise.all(esploraUtxos.map(this.outpointToUtxo));
    } catch (err: any) {
      throw err;
    }
  }
}
