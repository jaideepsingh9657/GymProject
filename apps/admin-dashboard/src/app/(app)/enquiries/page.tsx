"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AddEnquiryModal from "@/components/members/AddEnquiryModal";
import { Badge, Empty, ErrorNote, Modal, Skeleton, Stat } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { day, time } from "@/lib/format";
import type { EnquiryList, EnquiryRow, EnquiryStatus } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const FILTERS: [EnquiryStatus | "", string][] = [["", "All"], ["NEW", "New"], ["CONTACTED", "Contacted"], ["TRIAL_BOOKED", "Trial booked"], ["CONVERTED", "Converted"], ["LOST", "Lost"]];
const SOURCE = { WEBSITE: "Website", WHATSAPP: "WhatsApp", WALKIN: "Walk-in", OTHER: "Other" } as const;
const LIVE: EnquiryStatus[] = ["NEW", "CONTACTED", "TRIAL_BOOKED"];

const statusBadge = (s: EnquiryStatus) => ({
  NEW: <Badge tone="warn">New</Badge>, CONTACTED: <Badge tone="mute">Contacted</Badge>, TRIAL_BOOKED: <Badge tone="ok">Trial booked</Badge>,
  CONVERTED: <Badge tone="ok">Converted</Badge>, LOST: <Badge tone="bad">Lost</Badge>,
}[s]);

/** Follow-up urgency. Overdue and today get colour AND words. */
function followUp(e: EnquiryRow) {
  if (!e.followUpAt || !LIVE.includes(e.status)) return null;
  const d = new Date(e.followUpAt);
  const sameDay = (a: Date, b: Date) => a.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) === b.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  if (sameDay(d, new Date())) return <span className="text-warn">Today</span>;
  if (d < new Date()) return <span className="text-bad">Overdue · {day(e.followUpAt)}</span>;
  return <span className="text-mute">{day(e.followUpAt)}</span>;
}

export default function Enquiries() {
  const [filter, setFilter] = useState<EnquiryStatus | "">("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);
  const qs = new URLSearchParams({ page: String(page), limit: "15", ...(filter ? { status: filter } : {}), ...(debounced ? { search: debounced } : {}) });
  const { data, error, loading, reload } = useApi<EnquiryList>(`/enquiries?${qs}`);
  const sel = data?.items.find((i) => i.id === selected) ?? null;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const count = (s: EnquiryStatus | "") => (s === "" ? Object.values(data?.counts ?? {}).reduce((a, b) => a + (b ?? 0), 0) : data?.counts[s] ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="font-display text-3xl">Enquiries</h1><p className="text-sm text-mute">Leads from the website, WhatsApp and walk-ins, through to members.</p></div>
        <button className="btn btn-gold" onClick={() => setAdding(true)}>Add enquiry</button>
      </div>
      <ErrorNote message={error} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading && !data ? [0, 1, 2, 3].map((i) => <Skeleton key={i} />) : data && <>
          <Stat label="Follow-ups due" value={data.summary.followUpsDue} tone={data.summary.followUpsDue > 0 ? "bad" : undefined} hint="today or overdue" />
          <Stat label="Trials this week" value={data.summary.trialsThisWeek} tone="gold" />
          <Stat label="New leads, 30 days" value={data.summary.leads30d} />
          <Stat label="Converted" value={`${data.summary.conversionRate}%`} hint={`${data.summary.converted30d} of ${data.summary.leads30d} leads`} />
        </>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone or email" aria-label="Search enquiries" className="input max-w-xs" />
        <div role="group" aria-label="Filter" className="flex flex-wrap gap-1.5">
          {FILTERS.map(([v, l]) => <button key={v || "all"} aria-pressed={filter === v} onClick={() => { setFilter(v); setPage(1); }} className={`border px-3 py-1.5 text-xs ${filter === v ? "border-gold text-gold" : "border-line text-mute hover:text-bone"}`}>{l}{data ? ` · ${count(v)}` : ""}</button>)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {loading && !data ? <Skeleton className="h-64" /> : data && data.items.length === 0 ? (
            <div className="panel"><Empty title={debounced || filter ? "No enquiries match" : "No enquiries yet"} body={debounced || filter ? "Try a different search or filter." : "Leads from the website forms appear here automatically. Add walk-ins and WhatsApp leads yourself."} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[380px] text-left text-sm">
                <thead><tr className="label border-b border-line"><th className="py-2 pr-2 font-normal">Lead</th><th className="hidden font-normal sm:table-cell">Source</th><th className="font-normal">Follow-up</th><th className="font-normal">Status</th></tr></thead>
                <tbody>
                  {data?.items.map((e) => (
                    <tr key={e.id} className={`border-b border-line ${selected === e.id ? "bg-graphite" : "hover:bg-charcoal"}`}>
                      <td className="py-2 pr-2"><button onClick={() => setSelected(e.id)} className="text-left hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"><span className="block">{e.name}{e.isTrialRequest && <span className="ml-2 text-[10px] uppercase tracking-wider text-gold">Trial</span>}</span><span className="text-xs text-mute">{e.phone}</span></button></td>
                      <td className="hidden text-mute sm:table-cell">{SOURCE[e.source]}</td>
                      <td className="text-xs">{followUp(e) ?? <span className="text-mute">—</span>}</td>
                      <td>{statusBadge(e.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-between text-xs text-mute">
                <span>{data?.total} enquir{data?.total === 1 ? "y" : "ies"} · page {page} of {totalPages}</span>
                <span className="flex gap-2"><button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button></span>
              </div>
            </div>
          )}
        </div>
        <aside aria-label="Enquiry detail" className="panel min-w-0 lg:sticky lg:top-4 lg:self-start">
          {sel ? <Detail key={sel.id} e={sel} onChanged={reload} /> : <Empty title="Select an enquiry" body="Contact details, notes, trials and conversion show here." />}
        </aside>
      </div>

      {adding && <AddEnquiryModal onClose={() => setAdding(false)} onDone={(id) => { setAdding(false); setSelected(id); void reload(); }} />}
    </div>
  );
}

function Detail({ e, onChanged }: { e: EnquiryRow; onChanged: () => Promise<void> | void }) {
  const [notes, setNotes] = useState(e.notes ?? "");
  const [follow, setFollow] = useState(e.followUpAt ? e.followUpAt.slice(0, 10) : "");
  const [trialAt, setTrialAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [converted, setConverted] = useState<string | null>(null);
  const live = LIVE.includes(e.status);
  const digits = e.phone.replace(/\D/g, "");

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); await onChanged(); } catch (err) { setError(err instanceof ApiError ? (err.details?.join(". ") || err.message) : "Something went wrong"); } finally { setBusy(false); }
  }
  const patch = (body: object) => act(() => api(`/enquiries/${e.id}`, { method: "PATCH", body }));

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div><h2 className="font-display text-2xl">{e.name}</h2><p className="text-xs text-mute">{SOURCE[e.source]} · {day(e.createdAt)}{e.isTrialRequest ? " · trial request" : ""}</p></div>
        {statusBadge(e.status)}
      </div>
      <div className="my-3 flex flex-wrap gap-2">
        <a className="btn btn-ghost" href={`tel:${e.phone}`}>Call</a>
        <a className="btn btn-ghost" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <span className="self-center text-xs text-mute">{e.phone}{e.email ? ` · ${e.email}` : ""}</span>
      </div>
      <ErrorNote message={error} />

      {(e.goal || e.preferredTime || e.message) && (
        <dl className="mb-3 space-y-1 border-t border-line pt-2 text-sm">
          {e.goal && <div className="flex justify-between gap-3"><dt className="text-mute">Goal</dt><dd>{e.goal}</dd></div>}
          {e.preferredTime && <div className="flex justify-between gap-3"><dt className="text-mute">Prefers</dt><dd>{e.preferredTime}</dd></div>}
          {e.message && <div><dt className="text-mute">Message</dt><dd className="mt-0.5">{e.message}</dd></div>}
        </dl>
      )}

      {live && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {e.status !== "CONTACTED" && <button className="btn btn-ghost" disabled={busy} onClick={() => patch({ status: "CONTACTED" })}>Mark contacted</button>}
            <button className="btn btn-gold" disabled={busy} onClick={() => setConfirm(true)}>Convert to member</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => patch({ status: "LOST" })}>Mark lost</button>
          </div>

          <label className="label block" htmlFor="fu">Follow up on</label>
          <div className="mb-3 mt-1 flex gap-2">
            <input id="fu" type="date" value={follow} onChange={(ev) => setFollow(ev.target.value)} className="input" />
            <button className="btn btn-ghost" disabled={busy} onClick={() => patch({ followUpAt: follow ? `${follow}T09:00:00+05:30` : null })}>Save</button>
          </div>

          <label className="label block" htmlFor="tr">Schedule a trial</label>
          <div className="mb-3 mt-1 flex gap-2">
            <input id="tr" type="datetime-local" value={trialAt} onChange={(ev) => setTrialAt(ev.target.value)} className="input" />
            <button className="btn btn-ghost" disabled={busy || !trialAt} onClick={() => act(async () => { await api(`/enquiries/${e.id}/trial`, { method: "POST", body: { scheduledAt: new Date(trialAt).toISOString() } }); setTrialAt(""); })}>Book</button>
          </div>
        </>
      )}

      {e.trials.length > 0 && (
        <div className="mb-3">
          <h3 className="label">Trials</h3>
          {e.trials.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 border-t border-line py-1.5 text-sm first:mt-1">
              <span>{day(t.scheduledAt)} {time(t.scheduledAt)}</span>
              {t.status === "SCHEDULED" ? (
                <span className="flex gap-1">
                  {(["ATTENDED", "NO_SHOW", "CANCELLED"] as const).map((s) => <button key={s} className="btn btn-ghost !px-2 !py-1" disabled={busy} onClick={() => act(() => api(`/enquiries/${e.id}/trials/${t.id}`, { method: "PATCH", body: { status: s } }))}>{s === "ATTENDED" ? "Came" : s === "NO_SHOW" ? "No show" : "Cancel"}</button>)}
                </span>
              ) : <Badge tone={t.status === "ATTENDED" ? "ok" : "mute"}>{t.status === "ATTENDED" ? "Attended" : t.status === "NO_SHOW" ? "No show" : "Cancelled"}</Badge>}
            </div>
          ))}
        </div>
      )}

      <label className="label block" htmlFor="nt">Notes</label>
      <textarea id="nt" value={notes} onChange={(ev) => setNotes(ev.target.value)} rows={3} maxLength={2000} disabled={e.status === "CONVERTED"} className="input mt-1" placeholder="What was discussed?" />
      {e.status !== "CONVERTED" && notes !== (e.notes ?? "") && <button className="btn btn-ghost mt-2" disabled={busy} onClick={() => patch({ notes })}>Save notes</button>}

      {e.status === "CONVERTED" && e.convertedMemberId && !converted && <p className="mt-3 text-sm"><Link className="text-gold underline" href={`/members?search=${digits.slice(-10)}`}>Open member →</Link></p>}
      {!live && e.status === "LOST" && <button className="btn btn-ghost mt-3" disabled={busy} onClick={() => patch({ status: "NEW" })}>Reopen</button>}

      {confirm && (
        <Modal title={`Convert ${e.name}`} onClose={() => setConfirm(false)}>
          <p className="mb-4 text-sm text-mute">This creates a member with {e.phone} and marks the enquiry converted. You can sell them a plan from the Members screen next.</p>
          <ErrorNote message={error} />
          <div className="flex justify-end gap-2"><button className="btn btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn btn-gold" disabled={busy} onClick={() => act(async () => { const r = await api<{ memberId: string }>(`/enquiries/${e.id}/convert`, { method: "POST", body: {} }); setConverted(r.memberId); setConfirm(false); })}>{busy ? "Converting…" : "Create member"}</button></div>
        </Modal>
      )}
      {converted && <p role="status" className="mt-3 border border-ok/60 px-3 py-2 text-sm text-ok">Member created. <Link className="underline" href={`/members?search=${digits.slice(-10)}`}>Open member →</Link></p>}
    </div>
  );
}
