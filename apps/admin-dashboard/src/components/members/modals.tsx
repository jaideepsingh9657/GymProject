"use client";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { rupees, toPaise } from "@/lib/format";
import type { MemberDetail, PaymentRow, Plan } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { ErrorNote, Field, Modal } from "../ui";

const METHODS = ["CASH", "UPI", "CARD"] as const;
const msg = (e: unknown) => (e instanceof ApiError ? (e.details?.join(". ") || e.message) : "Something went wrong");

/** Runs an async action with busy/error state and a stable idempotency key for the life of the dialog. */
function useAction(onDone: () => void) {
  const key = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: (key: string) => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(key.current); onDone(); } catch (e) { setError(msg(e)); } finally { setBusy(false); }
  };
  return { busy, error, setError, run };
}

export function AddMemberModal({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const { busy, error, setError, run } = useAction(() => {});
  return (
    <Modal title="Add member" onClose={onClose}>
      <form onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const phone = String(f.get("phone") ?? "");
        if (!/^(?:\+91|91|0)?[\s-]?[6-9](?:[\s-]?\d){9}$/.test(phone)) return setError("Enter a valid 10-digit mobile number");
        void run(async () => {
          const m = await api<{ id: string }>("/members", { method: "POST", body: { name: String(f.get("name")).trim(), phone, ...(f.get("email") ? { email: String(f.get("email")) } : {}) } });
          onDone(m.id);
        });
      }}>
        <ErrorNote message={error} />
        <Field label="Full name"><input name="name" required maxLength={100} className="input" /></Field>
        <Field label="Mobile number"><input name="phone" type="tel" inputMode="tel" required placeholder="98XXXXXXXX" className="input" /></Field>
        <Field label="Email (optional)"><input name="email" type="email" className="input" /></Field>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : "Add member"}</button></div>
      </form>
    </Modal>
  );
}

export function SellModal({ member, onClose, onDone }: { member: { id: string; name: string }; onClose: () => void; onDone: () => void }) {
  const plans = useApi<Plan[]>("/plans");
  const [planId, setPlanId] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("CASH");
  const [amount, setAmount] = useState("");
  const { busy, error, setError, run } = useAction(onDone);
  const plan = plans.data?.find((p) => p.id === planId);

  return (
    <Modal title={`Sell or renew · ${member.name}`} onClose={onClose}>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!plan) return setError("Choose a plan");
        const paise = amount.trim() === "" ? 0 : toPaise(amount);
        if (Number.isNaN(paise) || paise < 0) return setError("Enter a valid amount");
        if (paise > plan.pricePaise) return setError(`Amount can't exceed ${rupees(plan.pricePaise)}`);
        void run((key) => api("/subscriptions", { method: "POST", key, body: { memberId: member.id, planId: plan.id, ...(paise > 0 ? { payment: { method, amountPaise: paise } } : {}) } }));
      }}>
        <ErrorNote message={error ?? plans.error} />
        <Field label="Plan">
          <select value={planId} onChange={(e) => { setPlanId(e.target.value); const p = plans.data?.find((x) => x.id === e.target.value); if (p) setAmount(String(p.pricePaise / 100)); }} className="input" required>
            <option value="">{plans.loading ? "Loading…" : "Select a plan"}</option>
            {plans.data?.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.durationDays} days · {rupees(p.pricePaise)}</option>)}
          </select>
        </Field>
        {plans.data?.length === 0 && <p className="mb-3 text-sm text-mute">No plans yet. Ask the owner to create plans first.</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Paying now (₹)"><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="input" placeholder="0" /></Field>
          <Field label="Method"><select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="input">{METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
        </div>
        <p className="text-xs text-mute">Leave the amount empty to record it as a due. A renewal starts the day after the current plan ends.</p>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : "Confirm"}</button></div>
      </form>
    </Modal>
  );
}

export function PayModal({ payment, onClose, onDone }: { payment: PaymentRow; onClose: () => void; onDone: () => void }) {
  const remaining = payment.amountDuePaise - payment.amountPaidPaise;
  const [amount, setAmount] = useState(String(remaining / 100));
  const [method, setMethod] = useState<(typeof METHODS)[number]>("CASH");
  const { busy, error, setError, run } = useAction(onDone);
  return (
    <Modal title="Record payment" onClose={onClose}>
      <form onSubmit={(e) => {
        e.preventDefault();
        const paise = toPaise(amount);
        if (!Number.isFinite(paise) || paise <= 0) return setError("Enter an amount");
        if (paise > remaining) return setError(`Amount can't exceed the ${rupees(remaining)} outstanding`);
        void run((key) => api("/payments", { method: "POST", key, body: { paymentId: payment.id, method, amountPaise: paise } }));
      }}>
        <ErrorNote message={error} />
        <p className="mb-3 text-sm text-mute">Outstanding <span className="text-bone">{rupees(remaining)}</span> of {rupees(payment.amountDuePaise)}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)"><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="input" /></Field>
          <Field label="Method"><select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="input">{METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
        </div>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : "Record payment"}</button></div>
      </form>
    </Modal>
  );
}

export function FreezeModal({ subId, name, onClose, onDone }: { subId: string; name: string; onClose: () => void; onDone: () => void }) {
  const [days, setDays] = useState("7");
  const { busy, error, setError, run } = useAction(onDone);
  return (
    <Modal title={`Freeze · ${name}`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); const n = Number(days); if (!Number.isInteger(n) || n < 1 || n > 90) return setError("Enter 1 to 90 days"); void run(() => api(`/subscriptions/${subId}/freeze`, { method: "POST", body: { days: n } })); }}>
        <ErrorNote message={error} />
        <Field label="Days to freeze"><input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" className="input" /></Field>
        <p className="text-xs text-mute">The member can't check in while frozen. Unfreezing adds the days actually frozen to the end date.</p>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : "Freeze"}</button></div>
      </form>
    </Modal>
  );
}

export function CancelModal({ subId, name, onClose, onDone }: { subId: string; name: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const { busy, error, setError, run } = useAction(onDone);
  return (
    <Modal title={`Cancel membership · ${name}`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (!reason.trim()) return setError("Give a reason"); void run(() => api(`/subscriptions/${subId}/cancel`, { method: "POST", body: { reason: reason.trim() } })); }}>
        <ErrorNote message={error} />
        <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className="input" /></Field>
        <p className="text-xs text-bad">This ends the membership and can't be undone. It is recorded in the audit log.</p>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn btn-ghost">Keep membership</button><button className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : "Cancel membership"}</button></div>
      </form>
    </Modal>
  );
}

export type { MemberDetail };
