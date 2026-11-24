/** Normalise an Indian mobile number to E.164 (+91XXXXXXXXXX). Returns null if invalid. */
export function normalizePhone(input: string): string | null {
  const s = input.replace(/[\s-]/g, "");
  const m = /^(?:\+91|91|0)?([6-9]\d{9})$/.exec(s);
  return m ? `+91${m[1]}` : null;
}
