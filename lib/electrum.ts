import { ElectrumUnspent, Outpoint, Output } from "./constants";
import { sleep } from "./utils";
import {
  crypto,
  address as laddress,
  Transaction,
  TxOutput,
} from "liquidjs-lib";

export class ElectrumWS {
  constructor(private wsEndpoint: string) { }

  notifyPayments(address: string, callback: (utxos: Output[]) => void): void {
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
    let unspentByID: Map<number, ElectrumUnspent> = new Map();
    let utxos: Output[] = [];
    ws.onmessage = async (ev: any) => {
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

      // check for listunspent response
      if (data.id && data.id === 2) {
        // check for sats amount
        const unspents: ElectrumUnspent[] = data.result;
        if (Array.isArray(unspents) && unspents.length > 0) {
          unspents.forEach((unspent, index) => {
            const id = 3 + index;

            // send tx request
            ws.send(
              JSON.stringify({
                id,
                method: "blockchain.transaction.get",
                params: [unspent.tx_hash, false],
              }),
            );

            // store the unspent by the JSONRPC id
            unspentByID.set(id, unspent);
          });
        }
      }

      // check for batch_transaction_get_raw
      if (data.id && data.id >= 3) {
        const id = data.id;
        const unspent = unspentByID.get(id);

        const rawhex = data.result;
        const tx = Transaction.fromHex(rawhex);

        if (unspent) {
          const prevout: TxOutput = tx.outs[unspent.tx_pos];
          utxos.push({
            txid: unspent.tx_hash,
            vout: unspent.tx_pos,
            prevout,
          });
        }

        // if we consumed all unspentByID then close the socket connection
        if (utxos.length === unspentByID.size) {
          // unsubscribe the socket
          ws.send(
            JSON.stringify({
              id: 1,
              method: "blockchain.scripthash.unsubscribe",
              params: [reversedAddressScriptHash],
            }),
          );

          // close socket
          ws.close();

          // notify for all unspents
          callback(utxos);
        }
      }
    };
  }

  async broadcastTx(rawHex: string): Promise<string> {
    return new Promise((resolve, reject) => {
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
        try {
          const data = JSON.parse(e.data);
          resolve(data.result);
        } catch (err: any) {
          reject(err);
        }
      };
      ws.onerror = (err: any) => {
        reject(err);
      }
    });
  }
}

export class ElectrumHTTP {
  constructor(private httpEndpoint: string) { }

  async fetchTxHex(txId: string): Promise<string> {
    const res = await fetch(`${this.httpEndpoint}/tx/${txId}/hex`);
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
