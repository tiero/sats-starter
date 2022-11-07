import { NetworkString } from "../constants";

interface CreateSwapCommonRequest {
  type: "submarine" | "reversesubmarine";
  pairId: "L-BTC/BTC";
  orderSide: "buy" | "sell";
}

interface CreateSwapCommonResponse {
  id: string;
  timeoutBlockHeight: number;
}

export type SubmarineSwapRequest = {
  invoice: string;
  refundPublicKey: string;
};

export type ReverseSubmarineSwapRequest = {
  preimageHash: string;
  onchainAmount: number;
  claimPublicKey: string;
};

export type SubmarineSwapResponse = {
  address: string;
  redeemScript: string;
  acceptZeroConf: boolean;
  expectedAmount: number;
  bip21: string;
};

export type ReverseSubmarineSwapResponse = {
  id: string;
  invoice: string;
  lockupAddress: string;
  onchainAmount: number;
  redeemScript: string;
  timeoutBlockHeight: number;
};

export const boltzUrl: Record<NetworkString, string> = {
  regtest: "http://localhost:9090",
  testnet: "https://testnet.boltz.exchange/api",
  liquid: "https://boltz.exchange/api",
};

export default class Boltz {
  url: string;
  constructor(network: NetworkString) {
    this.url = boltzUrl[network];
  }

  createSubmarineSwap = async (
    req: SubmarineSwapRequest,
  ): Promise<CreateSwapCommonResponse & SubmarineSwapResponse> => {
    const base: CreateSwapCommonRequest = {
      type: "submarine",
      pairId: "L-BTC/BTC",
      orderSide: "sell",
    };
    const params: CreateSwapCommonRequest & SubmarineSwapRequest = {
      ...base,
      ...req,
    };
    return this.callCreateSwap(params);
  };

  createReverseSubmarineSwap = async (
    req: ReverseSubmarineSwapRequest,
  ): Promise<CreateSwapCommonResponse & ReverseSubmarineSwapResponse> => {
    const base: CreateSwapCommonRequest = {
      type: "reversesubmarine",
      pairId: "L-BTC/BTC",
      orderSide: "buy",
    };
    const params: CreateSwapCommonRequest & ReverseSubmarineSwapRequest = {
      ...base,
      ...req,
    };
    return this.callCreateSwap(params);
  };

  getPair = async (pair: string) => {
    const data = await this.getApi(`${this.url}/getpairs`);
    if (!data?.pairs?.[pair]) return;
    return data.pairs[pair];
  };

  private callCreateSwap = async (
    params: CreateSwapCommonRequest,
  ): Promise<CreateSwapCommonResponse & any> => {
    return this.postApi(`${this.url}/createswap`, params);
  };

  private getApi = async (url: string): Promise<any> => {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (err: any) {
      throw err;
    }
  };

  private postApi = async (url: string, data: any = {}): Promise<any> => {
    try {
      const res = await fetch(url, {
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!res.ok) {
        const errorMessage = await res.text();
        throw new Error(`${res.statusText}: ${errorMessage}`);
      }
      return await res.json();
    } catch (err: any) {
      throw err;
    }
  };
}
