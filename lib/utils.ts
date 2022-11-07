import Decimal from "decimal.js";
import { writeUInt64LE } from "liquidjs-lib/src/bufferutils";

// number to string
export function numberToHexEncodedUint64LE(n: number): string {
  const num = Decimal.floor(n).toNumber();
  const buf = Buffer.alloc(8);
  writeUInt64LE(buf, num, 0);
  return "0x".concat(buf.toString("hex"));
}

export function toSatoshis(fractional: number, precision: number = 8): number {
  return Decimal.floor(
    new Decimal(fractional).mul(Decimal.pow(10, precision)),
  ).toNumber();
}

export function fromSatoshis(
  integer: number = 0,
  precision: number = 8,
): number {
  return new Decimal(integer).div(Decimal.pow(10, precision)).toNumber();
}

export async function sleep(miliseconds: number) {
  await Promise.resolve(
    new Promise((resolve) => {
      setTimeout(resolve, miliseconds);
    }),
  );
}
