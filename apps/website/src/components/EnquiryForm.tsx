"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { site, waLink } from "@/content/site";

type Props = { mode: "trial" | "contact" };

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Saves the lead to the gym's backend; WhatsApp is offered as a fallback, not the primary path. */
export default function EnquiryForm({ mode }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [summary, setSummary] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const phone = String(f.get("phone") ?? "").replace(/\s|-/g, "");
    const err: Record<string, string> = {};
    if (name.length < 2) err.name = "Please enter your name.";
    if (!/^(\+91)?[6-9]\d{9}$/.test(phone)) err.phone = "Enter a valid 10-digit Indian mobile number.";
    setErrors(err);
    if (Object.keys(err).length) return;

    const goal = String(f.get("goal") ?? ""), time = String(f.get("time") ?? ""), message = String(f.get("message") ?? "");
    setSummary([mode === "trial" ? "Free trial request" : "Enquiry", `Name: ${name}`, `Phone: ${phone}`, goal && `Goal: ${goal}`, time && `Preferred time: ${time}`, message && `Message: ${message}`].filter(Boolean).join("\n"));
    setState("sending");
    try {
      const res = await fetch(`${API}/v1/public/enquiries`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, kind: mode === "trial" ? "TRIAL" : "ENQUIRY", ...(goal && { goal }), ...(time && { preferredTime: time }), ...(message && { message }), company: String(f.get("company") ?? "") }),
      });
      setState(res.ok ? "done" : "failed");
    } catch {
      setState("failed");
    }
  }

  const field = "w-full border border-line bg-charcoal px-4 py-3.5 text-bone placeholder:text-mute/60 focus:border-gold focus:outline-none";
  const label = "mb-2 block text-[11px] uppercase tracking-wider2 text-mute";

  return (
    <AnimatePresence mode="wait">
      {state === "done" ? (
        <motion.div key="ok" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-10 text-center" role="status">
          <p className="font-display text-4xl text-gold">Thank you.</p>
          <p className="mt-4 text-mute">{mode === "trial" ? "Your trial request is in." : "Your enquiry is in."} Our team will call you shortly.</p>
          <a href={waLink(summary)} className="btn btn-ghost mt-8">Or message us on WhatsApp</a>
        </motion.div>
      ) : (
        <motion.form key="form" onSubmit={submit} noValidate exit={{ opacity: 0 }} className="grid gap-6">
          {/* Honeypot: hidden from people and assistive tech; bots fill it and are ignored by the server. */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <div>
            <label htmlFor="name" className={label}>Full name</label>
            <input id="name" name="name" autoComplete="name" className={field} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} />
            {errors.name && <p id="name-err" className="mt-2 text-sm text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="phone" className={label}>Mobile number</label>
            <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98XXXXXXXX" className={field} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-err" : undefined} />
            {errors.phone && <p id="phone-err" className="mt-2 text-sm text-red-500">{errors.phone}</p>}
          </div>
          {mode === "trial" ? (
            <>
              <div>
                <label htmlFor="goal" className={label}>Primary goal</label>
                <select id="goal" name="goal" className={field} defaultValue="">
                  <option value="">Select</option><option>Build muscle</option><option>Lose fat</option><option>General fitness</option><option>Sports performance</option>
                </select>
              </div>
              <div>
                <label htmlFor="time" className={label}>Preferred time</label>
                <select id="time" name="time" className={field} defaultValue="">
                  <option value="">Select</option><option>Morning</option><option>Afternoon</option><option>Evening</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="message" className={label}>Message</label>
              <textarea id="message" name="message" rows={4} maxLength={1000} className={field} />
            </div>
          )}
          {state === "failed" && (
            <p role="alert" className="border border-red-500/60 px-4 py-3 text-sm text-red-500">
              We couldn't send that. Please try again, or <a className="underline" href={waLink(summary)}>message us on WhatsApp</a> or call {site.phone}.
            </p>
          )}
          <button type="submit" disabled={state === "sending"} className="btn btn-gold disabled:opacity-60">{state === "sending" ? "Sending…" : mode === "trial" ? "Book my free trial" : "Send enquiry"}</button>
          <p className="text-xs text-mute">Your details are only used to reply to this request.</p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
