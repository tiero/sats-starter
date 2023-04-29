import type { TagData } from "bolt11";
import bolt11 from "bolt11";
import { address, crypto, script, payments } from "liquidjs-lib";
import { fromSatoshis } from "../utils";
import { feeAmount, NetworkString, swapFeeAmount } from "../constants";
import Boltz, {
  ReverseSubmarineSwapResponse,
  SubmarineSwapResponse,
} from "./boltz";
import { randomBytes } from "crypto";
import Decimal from "decimal.js";

// lightning swap invoice amount limit (in satoshis)
export const DEFAULT_LIGHTNING_LIMITS = { maximal: 4294967, minimal: 50000 };
export const DEPOSIT_LIGHTNING_LIMITS = {
  maximal: DEFAULT_LIGHTNING_LIMITS.maximal - feeAmount - swapFeeAmount,
  minimal: DEFAULT_LIGHTNING_LIMITS.minimal - feeAmount - swapFeeAmount,
};

// UTILS

// check if amount is out of bounds for lightning swap
export const swapDepositAmountOutOfBounds = (amount = 0) =>
  amount > DEPOSIT_LIGHTNING_LIMITS.maximal ||
  amount < DEPOSIT_LIGHTNING_LIMITS.minimal;

// calculate boltz fees for a given amount
export const submarineSwapBoltzFees = (amount = 0) => {
  const minersFee = 340;
  const percentage = 1.005;
  const invoiceAmount = new Decimal(amount)
    .minus(minersFee)
    .div(percentage)
    .toNumber();
  return Decimal.ceil(amount - invoiceAmount).toNumber();
};

// return data for given tag in given invoice
export const getInvoiceTag = (invoice: string, tag: string): TagData => {
  const decodedInvoice = bolt11.decode(invoice);
  for (const { tagName, data } of decodedInvoice.tags) {
    if (tagName === tag) return data;
  }
  return "";
};

// return value in given invoice
export const getInvoiceValue = (invoice: string): number => {
  const { satoshis, millisatoshis } = bolt11.decode(invoice);
  if (satoshis) return fromSatoshis(satoshis);
  if (millisatoshis) return fromSatoshis(Number(millisatoshis) / 1000);
  return 0;
};

// return invoice expire date
export const getInvoiceExpireDate = (invoice: string): number => {
  const { timeExpireDate } = bolt11.decode(invoice);
  return timeExpireDate ? timeExpireDate * 1000 : 0; // milliseconds
};

// SUBMARINE SWAPS (LBTC => Lightning)

export interface SubmarineSwap {
  address: string;
  expectedAmount: number;
  redeemScript: string;
}

// validates redeem script is in expected template
const validSwapReedemScript = (
  redeemScript: string,
  refundPublicKey: string,
) => {
  const scriptAssembly = script
    .toASM(script.decompile(Buffer.from(redeemScript, "hex")) || [])
    .split(" ");
  const boltzHash = scriptAssembly[4];
  const cltv = scriptAssembly[6];
  const preimageHash = scriptAssembly[1];
  const expectedScript = [
    "OP_HASH160",
    preimageHash,
    "OP_EQUAL",
    "OP_IF",
    boltzHash,
    "OP_ELSE",
    cltv,
    "OP_NOP2",
    "OP_DROP",
    refundPublicKey,
    "OP_ENDIF",
    "OP_CHECKSIG",
  ];
  return scriptAssembly.join() === expectedScript.join();
};

// check if everything is correct with data received from Boltz:
// - redeem script
export const isValidSubmarineSwap = ({
  address,
  expectedAmount,
  redeemScript,
}: SubmarineSwap): boolean => validSwapReedemScript(redeemScript, address);

// create submarine swap
export const createSubmarineSwap = async (
  invoice: string,
  network: NetworkString,
  refundPublicKey: string,
) => {
  // boltz object
  const boltz = new Boltz(network);

  // create submarine swap
  const { expectedAmount, address, redeemScript }: SubmarineSwapResponse =
    await boltz.createSubmarineSwap({
      invoice,
      refundPublicKey,
    });

  const submarineSwap = {
    address,
    expectedAmount,
    redeemScript,
  };
  if (isValidSubmarineSwap(submarineSwap)) return submarineSwap;
};

// REVERSE SUBMARINE SWAPS (Lightning => LBTC)

export interface ReverseSwap {
  claimPublicKey: string;
  id: string;
  invoice: string;
  lockupAddress: string;
  preimage: Buffer;
  redeemScript: string;
  timeoutBlockHeight: number;
}

// validates if invoice has correct payment hash tag
const correctPaymentHashInInvoice = (invoice: string, preimage: Buffer) => {
  const paymentHash = getInvoiceTag(invoice, "payment_hash");
  const preimageHash = crypto.sha256(preimage).toString("hex");
  return paymentHash === preimageHash;
};

// validates if reverse swap address derives from redeem script
const reverseSwapAddressDerivesFromScript = (
  lockupAddress: string,
  redeemScript: string,
) => {
  const addressScript = address.toOutputScript(lockupAddress);
  const addressScriptASM = script.toASM(script.decompile(addressScript) || []);
  const sha256 = crypto
    .sha256(Buffer.from(redeemScript, "hex"))
    .toString("hex");
  const expectedAddressScriptASM = `OP_0 ${sha256}`; // P2SH
  return addressScriptASM === expectedAddressScriptASM;
};

// check if everything is correct with data received from Boltz:
// - invoice
// - lockup address
// - redeem script
const isValidReverseSubmarineSwap = ({
  invoice,
  lockupAddress,
  preimage,
  claimPublicKey,
  redeemScript,
}: ReverseSwap): boolean => {
  return (
    correctPaymentHashInInvoice(invoice, preimage) &&
    reverseSwapAddressDerivesFromScript(lockupAddress, redeemScript) &&
    validReverseSwapReedemScript(preimage, claimPublicKey, redeemScript)
  );
};

// validates if we can redeem with this redeem script
const validReverseSwapReedemScript = (
  preimage: Buffer,
  pubKey: string,
  redeemScript: string,
) => {
  const scriptAssembly = script
    .toASM(script.decompile(Buffer.from(redeemScript, "hex")) || [])
    .split(" ");
  const cltv = scriptAssembly[10];
  const refundPubKey = scriptAssembly[13];
  const expectedScript = [
    "OP_SIZE",
    "20",
    "OP_EQUAL",
    "OP_IF",
    "OP_HASH160",
    crypto.hash160(preimage).toString("hex"),
    "OP_EQUALVERIFY",
    pubKey,
    "OP_ELSE",
    "OP_DROP",
    cltv,
    "OP_NOP2",
    "OP_DROP",
    refundPubKey,
    "OP_ENDIF",
    "OP_CHECKSIG",
  ];
  return scriptAssembly.join() === expectedScript.join();
};

export const notifyWhenInMempoool = async (swapId: string, network: NetworkString, callback: () => void) => {
  const boltz = new Boltz(network);
  await boltz.subscribeSwapStatus(swapId, (status) => {
    switch (status) {
      case "transaction.mempool":
      case "transaction.confirmed": 
      case "invoice.settled":
        boltz.unssubscribeSwapStatus();
        callback();
      default:
        return;
    }
  });
}

// create reverse submarine swap
export const createReverseSubmarineSwap = async (
  publicKey: Buffer,
  network: NetworkString,
  onchainAmount: number,
): Promise<ReverseSwap | undefined> => {
  // boltz object
  const boltz = new Boltz(network);

  // preimage
  const preimage = randomBytes(32);
  const preimageHash = crypto.sha256(preimage).toString("hex");

  // claim public key
  const p = payments.p2pkh({ pubkey: publicKey });
  const claimPublicKey = p.pubkey!.toString("hex");

  // create reverse submarine swap
  const {
    id,
    invoice,
    lockupAddress,
    redeemScript,
    timeoutBlockHeight,
  }: ReverseSubmarineSwapResponse = await boltz.createReverseSubmarineSwap({
    claimPublicKey,
    onchainAmount,
    preimageHash,
  });

  const reverseSwap = {
    claimPublicKey,
    id,
    invoice,
    lockupAddress,
    preimage,
    redeemScript,
    timeoutBlockHeight,
  };
  if (isValidReverseSubmarineSwap(reverseSwap)) return reverseSwap;
};
