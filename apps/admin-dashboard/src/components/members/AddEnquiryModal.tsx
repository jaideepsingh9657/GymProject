"use client";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { ErrorNote, Field, Modal } from "../ui";

export default function AddEnquiryModal({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone") ?? "");
    if (!/^(?:\+91|91|0)?[\s-]?[6-9](?:[\s-]?\d){9}$/.test(phone)) return setError("Enter a valid 10-digit mobile number");
    const follow = String(f.get("follow") ?? "");
    setBusy(true); setError(null);
    try {
      const r = await api<{ id: string }>("/enquiries", { method: "POST", key: key.current, body: {
        name: String(f.get("name")).trim(), phone, source: String(f.get("source")),
        ...(f.get("message") ? { message: String(f.get("message")) } : {}),
        ...(follow ? { followUpAt: `${follow}T09:00:00+05:30` } : {}),
      } });
      onDone(r.id);
    } catch (err) { setError(err instanceof ApiError ? (err.details?.join(". ") || err.message) : "Something went wrong"); setBusy(false); }
  }

  return (
    <Modal title="Add enquiry" onClose={onClose}>
      <form onSubmit={submit}>
        <ErrorNote message={error} />
        <Field label="Name"><input name="name" required minLength={2} maxLength={100} className="input" /></Field>
        <Field label="Mobile number"><input name="phone" type="tel" inputMode="tel" required placeholder="98XXXXXXXX" className="input" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source"><select name="source" defaultValue="WALKIN" className="input"><option value="WALKIN">Walk-in</option><option value="WHATSAPP">WhatsApp</option><option value="OTHER">Other</option></select></Field>
          <Field label="Follow up on"><input name="follow" type="date" className="input" /></Field>
        </div>
        <Field label="Note (optional)"><textarea name="message" rows={2} maxLength={1000} className="input" /></Field>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : "Add enquiry"}</button></div>
      </form>
    </Modal>
  );
}
