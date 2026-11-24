"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AddMemberModal, CancelModal, FreezeModal, PayModal, SellModal } from "@/components/members/modals";
import { Badge, Empty, ErrorNote, Skeleton, StateBadge } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { day, rupees } from "@/lib/format";
import type { MemberDetail, MemberList, PaymentRow } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const FILTERS = [["", "All"], ["ACTIVE", "Active"], ["EXPIRING", "Expiring"], ["EXPIRED", "Expired"], ["DUES", "Dues"]] as const;
type Dialog = null | "add" | "sell" | "freeze" | "cancel" | { pay: PaymentRow };

export default function MembersView() {
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [debounced, setDebounced] = useState(search);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { const s = params.get("search"); if (s !== null) setSearch(s); }, [params]);

  const qs = new URLSearchParams({ page: String(page), limit: "15", ...(debounced ? { search: debounced } : {}), ...(filter ? { filter } : {}) });
  const list = useApi<MemberList>(`/members?${qs}`);
  const detail = useApi<MemberDetail>(selected ? `/members/${selected}` : null);
  const refresh = () => { void list.reload(); void detail.reload(); setDialog(null); };

  const d = detail.data;
  const liveSub = d?.subscriptions.find((s) => s.status === "ACTIVE" || s.status === "FROZEN");
  const openPayment = d?.payments.find((p) => p.status === "PENDING" || p.status === "PARTIAL");
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.limit)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Members <span className="label ml-2">{list.data?.total ?? ""}</span></h1>
        <button className="btn btn-gold" onClick={() => setDialog("add")}>Add member</button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone or code" aria-label="Search" className="input max-w-xs" />
        <div role="group" aria-label="Filter" className="flex flex-wrap gap-1.5">
          {FILTERS.map(([v, l]) => (
            <button key={v} aria-pressed={filter === v} onClick={() => { setFilter(v); setPage(1); }} className={`border px-3 py-1.5 text-xs ${filter === v ? "border-gold text-gold" : "border-line text-mute hover:text-bone"}`}>{l}</button>
          ))}
        </div>
      </div>
      <ErrorNote message={list.error} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {list.loading && !list.data ? <Skeleton className="h-64" /> : list.data && list.data.items.length === 0 ? (
            <div className="panel"><Empty title={debounced || filter ? "No members match" : "Add your first member"} body={debounced || filter ? "Try a different search or filter." : "Members you register will appear here."} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[380px] text-left text-sm">
                <thead><tr className="label border-b border-line"><th className="py-2 pr-2 font-normal">Member</th><th className="hidden font-normal xl:table-cell">Plan</th><th className="font-normal">Ends</th><th className="font-normal">Status</th></tr></thead>
                <tbody>
                  {list.data?.items.map((m) => (
                    <tr key={m.id} className={`border-b border-line ${selected === m.id ? "bg-graphite" : "hover:bg-charcoal"}`}>
                      <td className="py-2 pr-2"><button onClick={() => setSelected(m.id)} className="text-left hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"><span className="block">{m.name}</span><span className="text-xs text-mute">{m.memberCode} · {m.phone}</span></button></td>
                      <td className="hidden xl:table-cell">{m.planName ?? "—"}</td><td>{day(m.endDate)}</td>
                      <td><StateBadge state={m.state} dues={m.duesPaise} />{m.duesPaise > 0 && m.state !== "ACTIVE" && <span className="ml-1"><Badge tone="warn">Dues</Badge></span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-between text-xs text-mute">
                <span>Page {page} of {totalPages}</span>
                <span className="flex gap-2"><button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button></span>
              </div>
            </div>
          )}
        </div>

        <aside aria-label="Member detail" className="panel min-w-0 lg:sticky lg:top-4 lg:self-start">
          {!selected && <Empty title="Select a member" body="Their membership, payments and attendance show here." />}
          {selected && detail.loading && !d && <Skeleton className="h-64" />}
          <ErrorNote message={selected ? detail.error : null} />
          {d && (
            <div>
              <div className="flex items-start justify-between gap-2">
                <div><h2 className="font-display text-2xl">{d.name}</h2><p className="text-xs text-mute">{d.memberCode} · {d.user.phone}</p></div>
                <StateBadge state={d.state} />
              </div>
              <div className="my-3 flex flex-wrap gap-2">
                <button className="btn btn-gold" onClick={() => setDialog("sell")}>{liveSub ? "Renew" : "Sell plan"}</button>
                {openPayment && <button className="btn btn-ghost" onClick={() => setDialog({ pay: openPayment })}>Record payment</button>}
                {liveSub?.status === "ACTIVE" && <button className="btn btn-ghost" onClick={() => setDialog("freeze")}>Freeze</button>}
                {liveSub?.status === "FROZEN" && <UnfreezeButton id={liveSub.id} onDone={refresh} />}
                {liveSub && <button className="btn btn-ghost" onClick={() => setDialog("cancel")}>Cancel plan</button>}
              </div>

              <h3 className="label mt-4">Membership</h3>
              {d.subscriptions.length === 0 ? <p className="py-2 text-sm text-mute">No membership yet.</p> : d.subscriptions.slice(0, 4).map((s) => (
                <div key={s.id} className="flex justify-between border-t border-line py-1.5 text-sm"><span>{s.plan.name} <span className="text-xs text-mute">{s.status.toLowerCase()}</span></span><span className="text-mute">{day(s.startDate)} to {day(s.endDate)}</span></div>
              ))}
              {d.assignments[0] && <p className="mt-1 text-xs text-mute">Trainer: {d.assignments[0].trainer.name}</p>}

              <h3 className="label mt-4">Payments</h3>
              {d.payments.length === 0 ? <p className="py-2 text-sm text-mute">No payments yet.</p> : d.payments.slice(0, 4).map((p) => (
                <div key={p.id} className="flex justify-between border-t border-line py-1.5 text-sm">
                  <span>{day(p.createdAt)} <span className="text-xs text-mute">{p.receiptNo ?? "no receipt"}</span></span>
                  <span className={p.status === "PAID" ? "text-ok" : "text-warn"}>{p.status === "PAID" ? `${rupees(p.amountPaidPaise)} paid` : `${rupees(p.amountDuePaise - p.amountPaidPaise)} due`}</span>
                </div>
              ))}

              <h3 className="label mt-4">Attendance, last 30 days · {d.attendance.length} visits</h3>
              <div className="mt-2 flex flex-wrap gap-0.5" role="img" aria-label={`${d.attendance.length} visits in the last 30 days`}>
                {Array.from({ length: 30 }, (_, i) => { const dt = new Date(Date.now() - (29 - i) * 86_400_000).toISOString().slice(0, 10); const hit = d.attendance.some((a) => a.localDate.slice(0, 10) === dt); return <span key={i} className={`h-3 w-3 ${hit ? "bg-gold" : "bg-graphite"}`} />; })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {dialog === "add" && <AddMemberModal onClose={() => setDialog(null)} onDone={(id) => { setSelected(id); refresh(); }} />}
      {dialog === "sell" && d && <SellModal member={d} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === "freeze" && d && liveSub && <FreezeModal subId={liveSub.id} name={d.name} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === "cancel" && d && liveSub && <CancelModal subId={liveSub.id} name={d.name} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog && typeof dialog === "object" && <PayModal payment={dialog.pay} onClose={() => setDialog(null)} onDone={refresh} />}
    </div>
  );
}

function UnfreezeButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return <button className="btn btn-ghost" disabled={busy} onClick={async () => { setBusy(true); try { await api(`/subscriptions/${id}/unfreeze`, { method: "POST" }); onDone(); } catch (e) { alert(e instanceof ApiError ? e.message : "Failed"); } finally { setBusy(false); } }}>Unfreeze</button>;
}
