/** Calendar-day helpers. Dates are @db.Date, carried as UTC midnight of the branch-local day. */
export const parseDate = (s: string) => new Date(`${s}T00:00:00.000Z`);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
export const iso = (d: Date) => d.toISOString().slice(0, 10);

export function localToday(tz = "Asia/Kolkata", now = new Date()): Date {
  return parseDate(new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now));
}
