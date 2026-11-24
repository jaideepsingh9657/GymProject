import { BadRequestException } from "@nestjs/common";

export function requireIdempotencyKey(headers: Record<string, unknown>): string {
  const k = headers["idempotency-key"];
  if (typeof k !== "string" || k.length < 8 || k.length > 100) {
    throw new BadRequestException("Idempotency-Key header (8 to 100 chars) is required");
  }
  return k;
}
