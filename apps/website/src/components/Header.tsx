"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { nav, site } from "@/content/site";

export default function Header() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${solid || open ? "bg-ink/90 backdrop-blur border-b border-line" : "bg-transparent"}`}>
      <div className="container-x flex h-20 items-center justify-between">
        <Link href="/" className="font-display text-xl tracking-wide sm:text-2xl" onClick={() => setOpen(false)}>
          LUXURY <span className="text-gold">FITNESS</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-9 lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-xs uppercase tracking-[0.18em] text-bone/80 transition-colors hover:text-gold">{n.label}</Link>
          ))}
        </nav>
        <Link href="/book-trial" className="btn btn-gold hidden lg:inline-flex">Free Trial</Link>
        <button
          className="lg:hidden p-2" aria-label="Menu" aria-expanded={open} aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="block h-px w-6 bg-bone" />
          <span className="mt-1.5 block h-px w-6 bg-bone" />
          <span className="mt-1.5 block h-px w-4 bg-gold" />
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="container-x flex flex-col gap-1 pb-8 lg:hidden">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-line py-4 font-display text-2xl">{n.label}</Link>
          ))}
          <Link href="/book-trial" onClick={() => setOpen(false)} className="btn btn-gold mt-6">Book a Free Trial</Link>
        </nav>
      )}
      <span className="sr-only">{site.name}</span>
    </header>
  );
}
