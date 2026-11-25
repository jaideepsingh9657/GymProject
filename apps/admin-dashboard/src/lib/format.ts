const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export const rupees = (paise: number) => `₹ ${inr.format(Math.round(paise / 100))}`;
export const shortRupees = (paise: number) => {
  const r = paise / 100;
  if (r >= 1e7) return `₹ ${(r / 1e7).toFixed(1)}Cr`;
  if (r >= 1e5) return `₹ ${(r / 1e5).toFixed(1)}L`;
  return `₹ ${inr.format(Math.round(r))}`;
};
export const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—");
export const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
export const toPaise = (rupeesText: string) => Math.round(Number(rupeesText.replace(/,/g, "")) * 100);
export const minutesBetween = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000));
export const duration = (mins: number) => (mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`);
export const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;
export const addDaysIso = (iso: string, n: number) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
