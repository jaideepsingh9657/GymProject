"use client";
import { ReactNode, useEffect, useRef } from "react";
import type { MemberState } from "@/lib/types";

export function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "mute"; children: ReactNode }) {
  const c = { ok: "text-ok border-ok", warn: "text-warn border-warn", bad: "text-bad border-bad", mute: "text-mute border-line" }[tone];
  return <span className={`badge ${c}`}>{children}</span>;
}

/** Status is always colour AND text, never colour alone. */
export function StateBadge({ state, dues }: { state: MemberState; dues?: number }) {
  if (dues && dues > 0 && state === "ACTIVE") return <Badge tone="warn">Dues</Badge>;
  const m = { ACTIVE: ["ok", "Active"], EXPIRING: ["warn", "Soon"], EXPIRED: ["bad", "Expired"], NONE: ["mute", "No plan"] } as const;
  return <Badge tone={m[state][0]}>{m[state][1]}</Badge>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "gold" | "bad" }) {
  return (
    <div className="panel">
      <p className="label">{label}</p>
      <p className={`mt-1 font-display text-3xl ${tone === "gold" ? "text-gold" : tone === "bad" ? "text-bad" : ""}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-mute">{hint}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input,select,button,textarea")?.focus();
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", on);
    return () => { window.removeEventListener("keydown", on); prev?.focus(); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="panel w-full max-w-md !p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-mute hover:text-gold">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, children, error }: { label: string; children: ReactNode; error?: string }) => (
  <label className="mb-3 block"><span className="label mb-1 block">{label}</span>{children}{error && <span role="alert" className="mt-1 block text-xs text-bad">{error}</span>}</label>
);

export const ErrorNote = ({ message }: { message: string | null }) => (message ? <p role="alert" className="mb-3 border border-bad/60 px-3 py-2 text-sm text-bad">{message}</p> : null);

export const Empty = ({ title, body }: { title: string; body: string }) => (
  <div className="py-10 text-center"><p className="font-display text-xl">{title}</p><p className="mt-1 text-sm text-mute">{body}</p></div>
);

export const Skeleton = ({ className = "h-16" }: { className?: string }) => <div className={`animate-pulse bg-graphite ${className}`} aria-hidden />;
