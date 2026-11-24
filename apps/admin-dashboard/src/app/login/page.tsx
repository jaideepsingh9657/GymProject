"use client";
import { useState } from "react";
import { ErrorNote, Field } from "@/components/ui";

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json", "x-requested-with": "lfg" }, body: JSON.stringify({ email: f.get("email"), password: f.get("password") }) }).catch(() => null);
    if (res?.ok) { window.location.href = "/today"; return; }
    setError((await res?.json().catch(() => null))?.message ?? "Can't reach the server. Try again.");
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <form onSubmit={submit} className="panel w-full max-w-sm !p-8">
        <p className="font-display text-2xl">LUXURY <span className="text-gold">FITNESS</span></p>
        <p className="label mb-6 mt-1">Staff sign in</p>
        <ErrorNote message={error} />
        <Field label="Email"><input name="email" type="email" autoComplete="username" required className="input" /></Field>
        <Field label="Password"><input name="password" type="password" autoComplete="current-password" required minLength={8} className="input" /></Field>
        <button className="btn btn-gold mt-2 w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
