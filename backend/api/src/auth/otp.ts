import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const generateOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

/** Codes are never stored: only an HMAC bound to the target, so a leaked row can't be replayed elsewhere. */
export const hashOtp = (secret: string, target: string, code: string) =>
  createHmac("sha256", secret).update(`${target}:${code}`).digest("hex");

export function otpMatches(secret: string, target: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(secret, target, code), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
