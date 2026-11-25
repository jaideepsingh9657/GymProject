"use client";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { TrainerRow } from "@/lib/types";
import { ErrorNote, Field, Modal } from "../ui";

export default function TrainerModal({ trainer, onClose, onDone }: { trainer: TrainerRow | null; onClose: () => void; onDone: (id: string) => void }) {
  const editing = !!trainer;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => String(f.get(k) ?? "").trim();
    const password = String(f.get("password") ?? "");
    if (!editing && password.length < 10) return setError("The initial password needs at least 10 characters");
    if (editing && password && password.length < 10) return setError("The new password needs at least 10 characters");
    const years = text("years");
    const common = {
      name: text("name"), qualifications: text("qualifications"), bio: text("bio"), availability: text("availability"),
      specializations: text("specs").split(",").map((s) => s.trim()).filter(Boolean),
      ...(years !== "" ? { experienceYears: Number(years) } : {}), isPublic: f.get("public") === "on",
    };
    setBusy(true); setError(null);
    try {
      if (editing) {
        await api(`/trainers/${trainer.id}`, { method: "PATCH", body: { ...common, ...(password ? { newPassword: password } : {}) } });
        onDone(trainer.id);
      } else {
        const created = await api<{ id: string }>("/trainers", { method: "POST", key: key.current, body: { ...common, email: text("email"), password, ...(text("phone") ? { phone: text("phone") } : {}) } });
        onDone(created.id);
      }
    } catch (err) { setError(err instanceof ApiError ? (err.details?.join(". ") || err.message) : "Something went wrong"); setBusy(false); }
  }

  return (
    <Modal title={editing ? `Edit ${trainer.name}` : "Add trainer"} onClose={onClose}>
      <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto pr-1">
        <ErrorNote message={error} />
        <Field label="Name"><input name="name" required defaultValue={trainer?.name} maxLength={100} className="input" /></Field>
        {!editing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email (their login)"><input name="email" type="email" required className="input" autoComplete="off" /></Field>
            <Field label="Mobile (optional)"><input name="phone" type="tel" className="input" /></Field>
          </div>
        )}
        <Field label={editing ? "Set a new password (leave blank to keep)" : "Initial password"}><input name="password" type="password" autoComplete="new-password" className="input" placeholder="At least 10 characters" /></Field>
        <Field label="Qualifications"><input name="qualifications" defaultValue={trainer?.qualifications ?? ""} maxLength={300} className="input" placeholder="e.g. NASM-CPT, B.P.Ed" /></Field>
        <Field label="Specialisations (comma separated)"><input name="specs" defaultValue={trainer?.specializations.join(", ")} className="input" placeholder="Strength, Fat loss, Mobility" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Years of experience"><input name="years" type="number" min={0} max={60} defaultValue={trainer?.experienceYears ?? ""} className="input" /></Field>
          <Field label="Availability"><input name="availability" defaultValue={trainer?.availability ?? ""} maxLength={200} className="input" placeholder="Mon–Sat 6am–12pm" /></Field>
        </div>
        <Field label="Bio"><textarea name="bio" rows={3} maxLength={1500} defaultValue={trainer?.bio ?? ""} className="input" /></Field>
        <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" name="public" defaultChecked={trainer?.isPublic ?? true} className="h-4 w-4 accent-[rgb(var(--c-gold))]" /> Show on the public website</label>
        {!editing && <p className="mb-2 text-xs text-mute">This creates a staff login. Share the password with the trainer securely and ask them to change it.</p>}
        <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add trainer"}</button></div>
      </form>
    </Modal>
  );
}
