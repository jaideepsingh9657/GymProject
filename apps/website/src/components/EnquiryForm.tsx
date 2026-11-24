"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { site, waLink } from "@/content/site";

type Props = { mode: "trial" | "contact" };

/**
 * No backend yet: on submit this validates and opens WhatsApp with the details
 * prefilled. Phase 3 replaces this with POST /v1/public/enquiries.
 */
export default function EnquiryForm({ mode }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const phone = String(f.get("phone") ?? "").replace(/\s|-/g, "");
    const err: Record<string, string> = {};
    if (name.length < 2) err.name = "Please enter your name.";
    if (!/^(\+91)?[6-9]\d{9}$/.test(phone)) err.phone = "Enter a valid 10-digit Indian mobile number.";
    setErrors(err);
    if (Object.keys(err).length) return;
    const lines = [
      mode === "trial" ? "Free trial request" : "Enquiry",
      `Name: ${name}`, `Phone: ${phone}`,
      f.get("goal") ? `Goal: ${f.get("goal")}` : "",
      f.get("time") ? `Preferred time: ${f.get("time")}` : "",
      f.get("message") ? `Message: ${f.get("message")}` : "",
    ].filter(Boolean);
    window.open(waLink(lines.join("\n")), "_blank", "noopener");
    setDone(true);
  }

  const field = "w-full border border-line bg-charcoal px-4 py-3.5 text-bone placeholder:text-mute/60 focus:border-gold focus:outline-none";
  const label = "mb-2 block text-[11px] uppercase tracking-wider2 text-mute";

  return (
    <AnimatePresence mode="wait">
      {done ? (
        <motion.div key="ok" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-10 text-center" role="status">
          <p className="font-display text-4xl text-gold">Thank you.</p>
          <p className="mt-4 text-mute">WhatsApp opened with your details. Send the message to reach {site.name}.</p>
          <button className="btn btn-ghost mt-8" onClick={() => setDone(false)}>Send another</button>
        </motion.div>
      ) : (
        <motion.form key="form" onSubmit={submit} noValidate exit={{ opacity: 0 }} className="grid gap-6">
          <div>
            <label htmlFor="name" className={label}>Full name</label>
            <input id="name" name="name" autoComplete="name" className={field} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} />
            {errors.name && <p id="name-err" className="mt-2 text-sm text-red-400">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="phone" className={label}>Mobile number</label>
            <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98XXXXXXXX" className={field} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-err" : undefined} />
            {errors.phone && <p id="phone-err" className="mt-2 text-sm text-red-400">{errors.phone}</p>}
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
              <textarea id="message" name="message" rows={4} className={field} />
            </div>
          )}
          <button type="submit" className="btn btn-gold">{mode === "trial" ? "Book via WhatsApp" : "Send via WhatsApp"}</button>
          <p className="text-xs text-mute">Your details are only used to reply to this request.</p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
