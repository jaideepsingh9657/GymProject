"use client";
import { useEffect, useState } from "react";
import { PayModal } from "@/components/members/modals";
import ReceiptModal from "@/components/members/ReceiptModal";
import { Badge, Empty, ErrorNote, Skeleton, Stat } from "@/components/ui";
import { day, rupees, shortRupees } from "@/lib/format";
import type { PaymentList, PaymentListRow } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const FILTERS = [["ALL", "All"], ["DUE", "Dues"], ["PAID", "Paid"]] as const;

const statusBadge = (s: PaymentListRow["status"]) =>
  s === "PAID" ? <Badge tone="ok">Paid</Badge> : s === "PARTIAL" ? <Badge tone="warn">Part paid</Badge> : s === "PENDING" ? <Badge tone="bad">Unpaid</Badge> : <Badge tone="mute">{s.toLowerCase()}</Badge>;

export default function Payments() {
  const [filter, setFilter] = useState<"ALL" | "DUE" | "PAID">("ALL");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<PaymentListRow | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  const qs = new URLSearchParams({ status: filter, page: String(page), limit: "15", ...(debounced ? { search: debounced } : {}) });
  const { data, error, loading, reload } = useApi<PaymentList>(`/payments?${qs}`);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-3xl">Payments</h1><p className="text-sm text-mute">Every sale and payment, with receipts. Record what members owe.</p></div>
      <ErrorNote message={error} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {loading && !data ? [0, 1, 2].map((i) => <Skeleton key={i} />) : data && <>
          <Stat label="Collected this month" value={shortRupees(data.summary.collectedMonthPaise)} tone="gold" />
          <Stat label="Outstanding" value={shortRupees(data.summary.outstandingPaise)} tone={data.summary.outstandingPaise > 0 ? "bad" : undefined} />
          <Stat label="Members with dues" value={data.summary.membersWithDues} />
        </>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Member name, code or receipt no" aria-label="Search payments" className="input max-w-xs" />
        <div role="group" aria-label="Filter" className="flex gap-1.5">
          {FILTERS.map(([v, l]) => <button key={v} aria-pressed={filter === v} onClick={() => { setFilter(v); setPage(1); }} className={`border px-3 py-1.5 text-xs ${filter === v ? "border-gold text-gold" : "border-line text-mute hover:text-bone"}`}>{l}</button>)}
        </div>
      </div>

      {loading && !data ? <Skeleton className="h-64" /> : data && data.items.length === 0 ? (
        <div className="panel"><Empty title={debounced || filter !== "ALL" ? "No payments match" : "No payments yet"} body={debounced || filter !== "ALL" ? "Try a different search or filter." : "Payments appear here when you sell or renew a membership."} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] sm:min-w-[640px] text-left text-sm">
            <thead><tr className="label border-b border-line"><th className="py-2 pr-2 font-normal">Date</th><th className="font-normal">Member</th><th className="hidden font-normal xl:table-cell">Plan</th><th className="text-right font-normal">Price</th><th className="text-right font-normal">Paid</th><th className="pl-3 font-normal">Status</th><th className="hidden font-normal sm:table-cell"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data?.items.map((p) => {
                const open = p.status === "PENDING" || p.status === "PARTIAL";
                return (
                  <tr key={p.id} className="border-b border-line hover:bg-charcoal">
                    <td className="py-2 pr-2 text-mute">{day(p.createdAt)}</td>
                    <td>
                      <span className="block">{p.member.name}</span><span className="text-xs text-mute">{p.member.memberCode}{p.receiptNo ? ` · ${p.receiptNo}` : ""}</span>
                      <span className="mt-1.5 flex gap-1.5 sm:hidden">
                        {open && <button className="btn btn-gold !px-3 !py-1" onClick={() => setPaying(p)}>Record</button>}
                        <button className="btn btn-ghost !px-3 !py-1" onClick={() => setReceipt(p.id)}>Receipt</button>
                      </span>
                    </td>
                    <td className="hidden xl:table-cell">{p.planName ?? "—"}</td>
                    <td className="text-right">{rupees(p.amountDuePaise)}</td>
                    <td className="text-right">{rupees(p.amountPaidPaise)}</td>
                    <td className="pl-3">{statusBadge(p.status)}</td>
                    <td className="hidden whitespace-nowrap py-1 text-right sm:table-cell">
                      {open && <button className="btn btn-gold !py-1.5" onClick={() => setPaying(p)}>Record</button>}
                      <button className="btn btn-ghost ml-1.5 !py-1.5" onClick={() => setReceipt(p.id)}>Receipt</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-3 flex items-center justify-between text-xs text-mute">
            <span>{data?.total} payment{data?.total === 1 ? "" : "s"} · page {page} of {totalPages}</span>
            <span className="flex gap-2"><button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button></span>
          </div>
        </div>
      )}

      {paying && <PayModal payment={{ id: paying.id, amountDuePaise: paying.amountDuePaise, amountPaidPaise: paying.amountPaidPaise, status: paying.status, receiptNo: paying.receiptNo, createdAt: paying.createdAt, transactions: [] }} onClose={() => setPaying(null)} onDone={() => { setPaying(null); void reload(); }} />}
      {receipt && <ReceiptModal paymentId={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
