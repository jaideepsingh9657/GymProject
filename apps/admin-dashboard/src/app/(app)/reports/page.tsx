"use client";
import Link from "next/link";
import { useState } from "react";
import { Empty, ErrorNote, Skeleton, Stat } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { addDaysIso, day, rupees, shortRupees } from "@/lib/format";
import type { ReportSummary } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useMe } from "@/lib/useMe";

const istToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
const lastDayOfMonth = (iso: string) => addDaysIso(`${addDaysIso(monthStart(iso), 32).slice(0, 7)}-01`, -1);

const PRESETS: { id: string; label: string; range: () => [string, string] }[] = [
  { id: "7", label: "Last 7 days", range: () => [addDaysIso(istToday(), -6), istToday()] },
  { id: "30", label: "Last 30 days", range: () => [addDaysIso(istToday(), -29), istToday()] },
  { id: "month", label: "This month", range: () => [monthStart(istToday()), istToday()] },
  { id: "last", label: "Last month", range: () => { const prev = addDaysIso(monthStart(istToday()), -1); return [monthStart(prev), lastDayOfMonth(prev)]; } },
  { id: "90", label: "Last 90 days", range: () => [addDaysIso(istToday(), -89), istToday()] },
  { id: "year", label: "This year", range: () => [`${istToday().slice(0, 4)}-01-01`, istToday()] },
];

const METHOD: Record<string, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card", ONLINE: "Online" };
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });

export default function Reports() {
  const { me, isOwner } = useMe();
  const [preset, setPreset] = useState("30");
  const [custom, setCustom] = useState<[string, string] | null>(null);
  const [from, to] = custom ?? PRESETS.find((p) => p.id === preset)!.range();
  const { data, error, loading } = useApi<ReportSummary>(isOwner ? `/reports/summary?from=${from}&to=${to}` : null);
  const [dlError, setDlError] = useState<string | null>(null);
  const [dl, setDl] = useState<string | null>(null);

  async function download(type: "sales" | "payments") {
    setDl(type); setDlError(null);
    try {
      const res = await fetch(`/api/proxy/v1/reports/export?type=${type}&from=${from}&to=${to}`, { cache: "no-store" });
      if (!res.ok) throw new ApiError((await res.json().catch(() => null))?.message ?? "Download failed", res.status);
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: `lfg-${type}-${from}-to-${to}.csv` });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { setDlError(e instanceof ApiError ? e.message : "Download failed"); } finally { setDl(null); }
  }

  if (me && !isOwner) {
    return <div className="space-y-4"><h1 className="font-display text-3xl">Reports</h1><div className="panel"><Empty title="Reports are for the owner" body="Revenue and financial reports are only available to the owner account." /></div></div>;
  }

  // Long ranges are bucketed weekly so the chart stays readable.
  const bars = (() => {
    const d = data?.revenueByDay ?? [];
    if (d.length <= 62) return d.map((x) => ({ label: day(x.date), paise: x.paise }));
    const out: { label: string; paise: number }[] = [];
    for (let i = 0; i < d.length; i += 7) { const w = d.slice(i, i + 7); out.push({ label: `Week of ${day(w[0].date)}`, paise: w.reduce((a, x) => a + x.paise, 0) }); }
    return out;
  })();
  const maxBar = Math.max(1, ...bars.map((b) => b.paise));
  const maxMethod = Math.max(1, ...(data?.revenueByMethod.map((m) => m.paise) ?? [1]));
  const maxJoin = Math.max(1, ...(data?.memberGrowth.map((m) => m.joins) ?? [1]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-3xl">Reports</h1><p className="text-sm text-mute">{day(from)} to {day(to)}{data ? ` · ${data.days} days` : ""}</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" disabled={!data || dl !== null} onClick={() => download("sales")}>{dl === "sales" ? "Preparing…" : "Sales CSV"}</button>
          <button className="btn btn-ghost" disabled={!data || dl !== null} onClick={() => download("payments")}>{dl === "payments" ? "Preparing…" : "Payments CSV"}</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Date range" className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => <button key={p.id} aria-pressed={!custom && preset === p.id} onClick={() => { setCustom(null); setPreset(p.id); }} className={`border px-3 py-1.5 text-xs ${!custom && preset === p.id ? "border-gold text-gold" : "border-line text-mute hover:text-bone"}`}>{p.label}</button>)}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-mute">
          <input type="date" aria-label="From" value={from} max={to} onChange={(e) => e.target.value && setCustom([e.target.value, to])} className="input !w-auto !py-1" />
          to
          <input type="date" aria-label="To" value={to} min={from} max={istToday()} onChange={(e) => e.target.value && setCustom([from, e.target.value])} className="input !w-auto !py-1" />
        </div>
      </div>
      <ErrorNote message={error ?? dlError} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {loading && !data ? [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} />) : data && <>
          <Stat label="Collected" value={shortRupees(data.revenuePaise)} tone="gold" />
          <Stat label="Memberships sold" value={data.sales.total} hint={`${data.sales.new} new · ${data.sales.renewals} renewals${data.sales.cancelled ? ` · ${data.sales.cancelled} cancelled` : ""}`} />
          <Stat label="Renewal rate" value={data.renewal.ratePercent === null ? "—" : `${data.renewal.ratePercent}%`} hint={data.renewal.expiring ? `${data.renewal.renewed} of ${data.renewal.expiring} that ended` : "no plans ended"} />
          <Stat label="New members" value={data.newMembers} />
          <Stat label="Outstanding now" value={shortRupees(data.outstanding.totalPaise)} tone={data.outstanding.totalPaise > 0 ? "bad" : undefined} hint={`${data.outstanding.members} member${data.outstanding.members === 1 ? "" : "s"}`} />
        </>}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="panel min-w-0" aria-labelledby="rev">
          <h2 id="rev" className="label">Revenue {data && data.revenueByDay.length > 62 ? "by week" : "by day"}</h2>
          {data && data.revenuePaise === 0 && bars.every((b) => b.paise === 0) ? <Empty title="No revenue in this range" body="Pick a wider range or another period." /> : (
            <div className="mt-3 flex h-36 items-end gap-0.5" role="img" aria-label="Revenue bars">
              {bars.map((b, i) => (
                <div key={i} className="group flex h-full flex-1 flex-col justify-end" title={`${b.label}: ${rupees(b.paise)}`}>
                  <div className="bg-gold/40 group-hover:bg-gold" style={{ height: `${Math.max(b.paise > 0 ? 3 : 1, (b.paise / maxBar) * 140)}px` }} />
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel" aria-labelledby="mth">
          <h2 id="mth" className="label">By payment method</h2>
          {data && data.revenueByMethod.length === 0 ? <p className="py-6 text-sm text-mute">No payments in this range.</p> : (
            <ul className="mt-3 space-y-3">
              {data?.revenueByMethod.map((m) => (
                <li key={m.method}>
                  <div className="flex justify-between text-sm"><span>{METHOD[m.method] ?? m.method}</span><span>{rupees(m.paise)}</span></div>
                  <div className="mt-1 h-1.5 bg-graphite"><div className="h-1.5 bg-gold" style={{ width: `${(m.paise / maxMethod) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="panel" aria-labelledby="plans">
          <h2 id="plans" className="label">Sales by plan</h2>
          {data && data.salesByPlan.length === 0 ? <p className="py-6 text-sm text-mute">No memberships sold in this range.</p> : (
            <table className="mt-2 w-full text-left text-sm">
              <thead><tr className="label border-b border-line"><th className="py-1.5 font-normal">Plan</th><th className="text-right font-normal">Sold</th><th className="text-right font-normal">Value</th></tr></thead>
              <tbody>{data?.salesByPlan.map((p) => <tr key={p.plan} className="border-b border-line"><td className="py-2">{p.plan}</td><td className="text-right">{p.count}</td><td className="text-right">{rupees(p.revenuePaise)}</td></tr>)}</tbody>
            </table>
          )}
        </section>
        <section className="panel" aria-labelledby="grow">
          <h2 id="grow" className="label">New members, last 12 months</h2>
          <div className="mt-3 flex h-28 items-end gap-1" role="img" aria-label="New members per month">
            {data?.memberGrowth.map((m) => (
              <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end" title={`${monthLabel(m.month)}: ${m.joins}`}>
                <span className="mb-0.5 text-[10px] text-mute">{m.joins || ""}</span>
                <div className="w-full bg-gold/50" style={{ height: `${Math.max(2, (m.joins / maxJoin) * 80)}px` }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1 text-[10px] text-mute">{data?.memberGrowth.map((m) => <span key={m.month} className="flex-1 text-center">{monthLabel(m.month)}</span>)}</div>
        </section>
      </div>

      <section className="panel" aria-labelledby="owed">
        <div className="flex items-baseline justify-between"><h2 id="owed" className="label">Largest dues, oldest first</h2><Link href="/payments" className="text-xs text-gold hover:text-gold-soft">All payments →</Link></div>
        {data && data.outstanding.top.length === 0 ? <p className="py-6 text-sm text-mute">Nobody owes anything. </p> : (
          <table className="mt-2 w-full text-left text-sm">
            <thead><tr className="label border-b border-line"><th className="py-1.5 font-normal">Member</th><th className="font-normal">Since</th><th className="text-right font-normal">Owes</th></tr></thead>
            <tbody>{data?.outstanding.top.map((o) => <tr key={o.paymentId} className="border-b border-line"><td className="py-2"><Link className="hover:text-gold" href={`/members?search=${o.member.memberCode}`}>{o.member.name}</Link> <span className="text-xs text-mute">{o.member.memberCode}</span></td><td className="text-mute">{day(o.since)}</td><td className="text-right text-bad">{rupees(o.owedPaise)}</td></tr>)}</tbody>
          </table>
        )}
      </section>
    </div>
  );
}
