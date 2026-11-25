"use client";
import { useState } from "react";
import { Badge, Empty, ErrorNote, Skeleton, Stat } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { addDaysIso, day, duration, hourLabel, minutesBetween, time } from "@/lib/format";
import type { AttendanceDay, AttendanceReport } from "@/lib/types";
import { useApi } from "@/lib/useApi";

interface CheckInResult { member: { name: string }; daysLeft: number; expiring: boolean }

export default function Attendance() {
  const [date, setDate] = useState<string | null>(null); // null = today
  const dayData = useApi<AttendanceDay>(`/attendance${date ? `?date=${date}` : ""}`);
  const report = useApi<AttendanceReport>("/attendance/report?days=30");

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [ciError, setCiError] = useState<string | null>(null);
  const [outBusy, setOutBusy] = useState<string | null>(null);
  const [outError, setOutError] = useState<string | null>(null);

  const d = dayData.data;
  const shownDate = d?.date ?? null;
  const isToday = !date || (report.data && date === report.data.to);
  const refresh = () => { void dayData.reload(); void report.reload(); };

  async function checkIn(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setCiError(null); setResult(null);
    try { setResult(await api<CheckInResult>("/attendance/check-in", { method: "POST", body: { memberCode: code.trim() } })); setCode(""); if (!isToday) setDate(null); refresh(); }
    catch (err) { setCiError(err instanceof ApiError ? err.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  async function checkOut(id: string) {
    setOutBusy(id); setOutError(null);
    try { await api(`/attendance/${id}/check-out`, { method: "POST" }); refresh(); }
    catch (err) { setOutError(err instanceof ApiError ? err.message : "Something went wrong"); }
    finally { setOutBusy(null); }
  }

  const r = report.data;
  const maxDaily = Math.max(1, ...(r?.daily.map((x) => x.count) ?? [1]));
  const maxHour = Math.max(1, ...(r?.byHour.map((x) => x.count) ?? [1]));
  const peak = r?.byHour.reduce((a, b) => (b.count > a.count ? b : a));
  const hours = r?.byHour.filter((h) => h.hour >= 5 && h.hour <= 23) ?? [];

  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-3xl">Attendance</h1><p className="text-sm text-mute">Who is in the gym, who has been, and when it's busy.</p></div>
      <ErrorNote message={dayData.error ?? report.error} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(dayData.loading && !d) || (report.loading && !r) ? [0, 1, 2, 3].map((i) => <Skeleton key={i} />) : d && r && <>
          <Stat label={isToday ? "In the gym now" : "Still not checked out"} value={d.insideNow} tone="gold" />
          <Stat label={isToday ? "Check-ins today" : "Check-ins that day"} value={d.items.length} />
          <Stat label="Average per day" value={r.avgPerDay} hint={`last ${r.days} days · ${r.uniqueMembers} members`} />
          <Stat label="Busiest hour" value={peak && peak.count > 0 ? hourLabel(peak.hour) : "—"} hint={r.avgVisitMinutes ? `average visit ${duration(r.avgVisitMinutes)}` : "no completed visits yet"} />
        </>}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="panel min-w-0" aria-labelledby="visits">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="visits" className="label">Visits · {shownDate ? day(shownDate) : ""}{isToday ? " (today)" : ""}</h2>
            <div className="flex items-center gap-1.5">
              <button className="btn btn-ghost !px-2.5 !py-1" aria-label="Previous day" onClick={() => shownDate && setDate(addDaysIso(shownDate, -1))}>←</button>
              <input type="date" aria-label="Choose date" value={shownDate ?? ""} max={r?.to} onChange={(e) => e.target.value && setDate(e.target.value === r?.to ? null : e.target.value)} className="input !w-auto !py-1" />
              <button className="btn btn-ghost !px-2.5 !py-1" aria-label="Next day" disabled={!!isToday} onClick={() => shownDate && setDate(addDaysIso(shownDate, 1) === r?.to ? null : addDaysIso(shownDate, 1))}>→</button>
              {!isToday && <button className="btn btn-ghost !py-1" onClick={() => setDate(null)}>Today</button>}
            </div>
          </div>
          <ErrorNote message={outError} />
          {dayData.loading && !d ? <Skeleton className="mt-3 h-40" /> : d && d.items.length === 0 ? (
            <Empty title={isToday ? "No one has checked in yet" : "No visits on this day"} body={isToday ? "Check-ins appear here as members arrive." : "Pick another date to see visits."} />
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead><tr className="label border-b border-line"><th className="py-2 pr-2 font-normal">Member</th><th className="font-normal">In</th><th className="font-normal">Out</th><th className="font-normal">Time</th><th className="font-normal"><span className="sr-only">Action</span></th></tr></thead>
                <tbody>
                  {d?.items.map((v) => (
                    <tr key={v.id} className="border-b border-line">
                      <td className="py-2 pr-2"><span className="block">{v.member.name}</span><span className="text-xs text-mute">{v.member.memberCode}</span></td>
                      <td>{time(v.checkInAt)}</td>
                      <td>{v.checkOutAt ? time(v.checkOutAt) : <Badge tone="ok">Inside</Badge>}</td>
                      <td className="text-mute">{v.checkOutAt ? duration(minutesBetween(v.checkInAt, v.checkOutAt)) : "—"}</td>
                      <td className="text-right">{!v.checkOutAt && isToday && <button className="btn btn-ghost !py-1" disabled={outBusy === v.id} onClick={() => checkOut(v.id)}>{outBusy === v.id ? "…" : "Check out"}</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-3">
          <section className="panel border-gold/60" aria-labelledby="ci">
            <h2 id="ci" className="label">Check in a member</h2>
            <form onSubmit={checkIn} className="mt-2 flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Member code, e.g. GYM-0001" aria-label="Member code" className="input" autoComplete="off" />
              <button className="btn btn-gold" disabled={busy}>{busy ? "…" : "Check in"}</button>
            </form>
            <div aria-live="polite" className="mt-2">
              {result && <p className="border border-ok/60 px-3 py-2 text-sm"><span className="text-ok">Checked in</span> · {result.member.name} · {result.daysLeft} days left{result.expiring ? " (renewal soon)" : ""}</p>}
              {ciError && <p className="border border-bad/60 px-3 py-2 text-sm text-bad">{ciError}</p>}
            </div>
          </section>

          <section className="panel" aria-labelledby="hrs">
            <h2 id="hrs" className="label">Busiest hours · last 30 days</h2>
            <div className="mt-3 flex h-24 items-end gap-0.5" role="img" aria-label="Check-ins by hour of day">
              {hours.map((h) => (
                <div key={h.hour} className="flex-1" title={`${hourLabel(h.hour)}: ${h.count} check-ins`}>
                  <div className={peak && h.hour === peak.hour && h.count > 0 ? "bg-gold" : "bg-gold/30"} style={{ height: `${Math.max(2, (h.count / maxHour) * 96)}px` }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-mute"><span>5am</span><span>12pm</span><span>11pm</span></div>
          </section>
        </div>
      </div>

      <section className="panel" aria-labelledby="dly">
        <div className="flex items-baseline justify-between"><h2 id="dly" className="label">Check-ins per day · last 30 days</h2><span className="text-xs text-mute">{r?.totalVisits ?? 0} visits</span></div>
        <div className="mt-3 flex h-28 items-end gap-0.5" role="img" aria-label="Daily check-ins for the last 30 days">
          {r?.daily.map((x, i, a) => (
            <button key={x.date} onClick={() => setDate(x.date === r.to ? null : x.date)} className="group flex h-full flex-1 flex-col justify-end" title={`${day(x.date)}: ${x.count} check-ins`} aria-label={`${day(x.date)}: ${x.count} check-ins`}>
              <div className={`${i === a.length - 1 ? "bg-gold" : "bg-gold/30 group-hover:bg-gold/60"}`} style={{ height: `${Math.max(2, (x.count / maxDaily) * 112)}px` }} />
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-mute">Click a bar to see that day's visits.</p>
      </section>
    </div>
  );
}
