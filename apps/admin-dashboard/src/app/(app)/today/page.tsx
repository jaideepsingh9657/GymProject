"use client";
import Link from "next/link";
import { useState } from "react";
import { SellModal } from "@/components/members/modals";
import { Badge, Empty, ErrorNote, Skeleton, Stat } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { day, shortRupees } from "@/lib/format";
import type { Dashboard } from "@/lib/types";
import { useApi } from "@/lib/useApi";

interface CheckInResult { member: { name: string; memberCode: string }; daysLeft: number; expiring: boolean }

export default function Today() {
  const { data, error, loading, reload } = useApi<Dashboard>("/dashboard/today");
  const [renew, setRenew] = useState<{ id: string; name: string } | null>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [ciError, setCiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function checkIn(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setCiError(null); setResult(null);
    try { setResult(await api<CheckInResult>("/attendance/check-in", { method: "POST", body: { memberCode: code.trim() } })); setCode(""); void reload(); }
    catch (err) { setCiError(err instanceof ApiError ? err.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  const max = Math.max(1, ...(data?.revenueByDay.map((d) => d.paise) ?? [1]));

  return (
    <div className="space-y-4">
      <div><p className="label">{data ? day(data.date) : " "}</p><h1 className="font-display text-3xl">Today</h1></div>
      <ErrorNote message={error} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading && !data ? [0, 1, 2, 3].map((i) => <Skeleton key={i} />) : data && <>
          <Stat label="Check-ins today" value={data.checkInsToday} />
          <Stat label="Active members" value={data.activeMembers} />
          <Stat label="Revenue this month" value={shortRupees(data.revenueMonthPaise)} tone="gold" />
          <Stat label="Pending dues" value={shortRupees(data.pendingDuesPaise)} hint={`${data.membersWithDues} member${data.membersWithDues === 1 ? "" : "s"}`} tone={data.pendingDuesPaise > 0 ? "bad" : undefined} />
        </>}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="panel" aria-labelledby="renewals">
          <div className="flex items-center justify-between"><h2 id="renewals" className="label">Renewals due, next 7 days</h2><span className="text-xs text-gold">{data?.renewalsDue.length ?? 0}</span></div>
          {data && data.renewalsDue.length === 0 && <Empty title="Nothing due this week" body="Members whose plans end soon will show up here." />}
          <ul>
            {data?.renewalsDue.map((r) => (
              <li key={r.subscriptionId} className="flex items-center justify-between gap-3 border-t border-line py-2.5 first:mt-2">
                <div className="min-w-0"><Link href={`/members?search=${r.member.memberCode}`} className="block truncate hover:text-gold">{r.member.name}</Link><p className="text-xs text-mute">{r.plan} · {r.daysLeft < 0 ? `ended ${-r.daysLeft}d ago` : r.daysLeft === 0 ? "ends today" : `ends in ${r.daysLeft}d`}</p></div>
                {r.daysLeft < 0 ? <Badge tone="bad">Expired</Badge> : null}
                <button className="btn btn-gold" onClick={() => setRenew({ id: r.member.id, name: r.member.name })}>Renew</button>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-3">
          <section className="panel border-gold/60" aria-labelledby="ci">
            <h2 id="ci" className="label">Quick check-in</h2>
            <form onSubmit={checkIn} className="mt-2 flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Member code, e.g. GYM-0001" aria-label="Member code" className="input" autoComplete="off" />
              <button className="btn btn-gold" disabled={busy}>{busy ? "…" : "Check in"}</button>
            </form>
            <div aria-live="polite" className="mt-2">
              {result && <p className="border border-ok/60 px-3 py-2 text-sm"><span className="text-ok">Checked in</span> · {result.member.name} · {result.daysLeft} days left{result.expiring ? " (renewal soon)" : ""}</p>}
              {ciError && <p className="border border-bad/60 px-3 py-2 text-sm text-bad">{ciError}</p>}
            </div>
          </section>
          <section className="panel">
            <h2 className="label">Enquiries</h2>
            <dl className="mt-2 text-sm">
              <div className="flex justify-between border-t border-line py-2"><dt className="text-mute">New</dt><dd>{data?.enquiries.NEW ?? 0}</dd></div>
              <div className="flex justify-between border-t border-line py-2"><dt className="text-mute">Trials booked</dt><dd className="text-gold">{data?.enquiries.TRIAL_BOOKED ?? 0}</dd></div>
            </dl>
          </section>
        </div>
      </div>

      <section className="panel" aria-labelledby="rev">
        <h2 id="rev" className="label">Revenue, last 14 days</h2>
        <div className="mt-3 flex h-24 items-end gap-1" role="img" aria-label="Daily revenue bars for the last 14 days">
          {(data?.revenueByDay ?? []).map((d, i, a) => (
            <div key={d.date} className="group relative flex-1" title={`${day(d.date)}: ${shortRupees(d.paise)}`}>
              <div className={i === a.length - 1 ? "bg-gold" : "bg-gold/30"} style={{ height: `${Math.max(2, (d.paise / max) * 96)}px` }} />
            </div>
          ))}
        </div>
      </section>

      {renew && <SellModal member={renew} onClose={() => setRenew(null)} onDone={() => { setRenew(null); void reload(); }} />}
    </div>
  );
}
