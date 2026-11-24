import { Prisma } from "@prisma/client";

/** Next receipt number from a DB sequence: unique under concurrency, e.g. LFG-2026-000042. */
export async function nextReceiptNo(tx: Prisma.TransactionClient, year: number): Promise<string> {
  const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('receipt_no_seq') AS n`;
  return `LFG-${year}-${String(n).padStart(6, "0")}`;
}

export function paymentStatus(due: number, paid: number): "PENDING" | "PARTIAL" | "PAID" {
  return paid <= 0 ? "PENDING" : paid >= due ? "PAID" : "PARTIAL";
}
