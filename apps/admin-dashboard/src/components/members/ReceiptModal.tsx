"use client";
import { day, rupees, time } from "@/lib/format";
import type { PaymentDetail } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { ErrorNote, Skeleton } from "../ui";

/** Printable receipt. Print styles in globals.css hide everything but this block. */
export default function ReceiptModal({ paymentId, onClose }: { paymentId: string; onClose: () => void }) {
  const { data: p, error } = useApi<PaymentDetail>(`/payments/${paymentId}`);
  const balance = p ? p.amountDuePaise - p.amountPaidPaise : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/80 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Receipt" className="receipt panel my-auto w-full max-w-md !p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div><p className="font-display text-2xl">LUXURY <span className="text-gold">FITNESS</span></p><p className="label">Payment receipt</p></div>
          <button onClick={onClose} aria-label="Close" className="no-print text-mute hover:text-gold">✕</button>
        </div>
        <ErrorNote message={error} />
        {!p && !error && <Skeleton className="h-48" />}
        {p && (
          <div className="text-sm">
            <dl className="space-y-1.5">
              <Row k="Receipt no" v={p.receiptNo ?? "Not issued (no payment received yet)"} />
              <Row k="Date" v={day(p.createdAt)} />
              <Row k="Member" v={`${p.member.name} (${p.member.memberCode})`} />
              {p.subscription && <Row k="Plan" v={`${p.subscription.plan.name} · ${day(p.subscription.startDate)} to ${day(p.subscription.endDate)}`} />}
            </dl>
            <table className="mt-4 w-full text-left">
              <thead><tr className="label border-b border-line"><th className="py-1.5 font-normal">Payment</th><th className="font-normal">Method</th><th className="text-right font-normal">Amount</th></tr></thead>
              <tbody>
                {p.transactions.length === 0 && <tr><td colSpan={3} className="py-3 text-mute">No payments received yet.</td></tr>}
                {p.transactions.map((t, i) => (
                  <tr key={i} className="border-b border-line"><td className="py-1.5">{day(t.createdAt)} {time(t.createdAt)}</td><td>{t.method}</td><td className="text-right">{t.type === "REFUND" ? "−" : ""}{rupees(t.amountPaise)}</td></tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 space-y-1">
              <Row k="Plan price" v={rupees(p.amountDuePaise)} />
              <Row k="Total paid" v={rupees(p.amountPaidPaise)} strong />
              <Row k="Balance due" v={rupees(balance)} strong={balance > 0} />
            </dl>
            <p className="mt-4 text-xs text-mute">Thank you for training with us. This receipt is computer generated.</p>
            <div className="no-print mt-4 flex justify-end gap-2"><button onClick={onClose} className="btn btn-ghost">Close</button><button onClick={() => window.print()} className="btn btn-gold">Print</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
  <div className="flex justify-between gap-4"><dt className="text-mute">{k}</dt><dd className={`text-right ${strong ? "font-medium text-gold" : ""}`}>{v}</dd></div>
);
