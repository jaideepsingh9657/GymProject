/**
 * RFC 4180 CSV. Cells that start with = + - @ (or tab/CR) are prefixed with an apostrophe so a
 * member's name or note can't run as a formula when the file is opened in Excel or Sheets.
 */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const rupees = (paise: number) => (paise / 100).toFixed(2);
