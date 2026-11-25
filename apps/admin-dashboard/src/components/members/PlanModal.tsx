"use client";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { rupees, toPaise } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { ErrorNote, Field, Modal } from "../ui";

const PRESETS = [[30, "1 month"], [90, "3 months"], [180, "6 months"], [365, "12 months"]] as const;

export default function PlanModal({ plan, onClose, onDone }: { plan: Plan | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(plan?.name ?? "");
  const [days, setDays] = useState(String(plan?.durationDays ?? 30));
  const [price, setPrice] = useState(plan ? String(plan.pricePaise / 100) : "");
  const [active, setActive] = useState(plan?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const d = Number(days), p = toPaise(price);
    if (!name.trim()) return setError("Give the plan a name");
    if (!Number.isInteger(d) || d < 1 || d > 3650) return setError("Duration must be 1 to 3650 days");
    if (!Number.isFinite(p) || p < 0) return setError("Enter a valid price");
    setBusy(true); setError(null);
    try {
      const body = { name: name.trim(), durationDays: d, pricePaise: p, isActive: active };
      if (plan) await api(`/plans/${plan.id}`, { method: "PATCH", body });
      else await api("/plans", { method: "POST", body, key: key.current });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? (err.details?.join(". ") || err.message) : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <Modal title={plan ? `Edit ${plan.name}` : "New plan"} onClose={onClose}>
      <form onSubmit={submit}>
        <ErrorNote message={error} />
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="input" placeholder="Quarterly" /></Field>
        <Field label="Duration (days)">
          <input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" className="input" />
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {PRESETS.map(([d, l]) => <button key={d} type="button" onClick={() => setDays(String(d))} className={`border px-2 py-0.5 text-xs ${days === String(d) ? "border-gold text-gold" : "border-line text-mute hover:text-bone"}`}>{l}</button>)}
          </span>
        </Field>
        <Field label="Price (₹)"><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="input" placeholder="5400" /></Field>
        <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--c-gold))]" /> Available to sell</label>
        {plan && plan.pricePaise !== toPaise(price) && Number.isFinite(toPaise(price)) && <p className="mb-2 text-xs text-mute">Price changes apply to new sales only. Existing memberships keep the {rupees(plan.pricePaise)} they were sold at.</p>}
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : plan ? "Save changes" : "Create plan"}</button></div>
      </form>
    </Modal>
  );
}
