"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/today", label: "Today", live: true }, { href: "/members", label: "Members", live: true },
  { href: "/memberships", label: "Memberships", live: true }, { href: "/payments", label: "Payments", live: true }, { href: "/attendance", label: "Attendance" },
  { href: "/enquiries", label: "Enquiries" }, { href: "/trainers", label: "Trainers" }, { href: "/reports", label: "Reports" }, { href: "/settings", label: "Settings" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", headers: { "x-requested-with": "lfg" } });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="border-b border-line lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <p className="font-display text-xl">LUXURY <span className="text-gold">FITNESS</span></p>
          <p className="label hidden lg:block">Admin</p>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-2 pb-2 lg:block lg:space-y-0.5 lg:px-2">
          {NAV.map((n) => {
            const on = path === n.href || path.startsWith(`${n.href}/`);
            return (
              <Link key={n.href} href={n.live ? n.href : `/${n.href.slice(1)}`} aria-current={on ? "page" : undefined}
                className={`flex shrink-0 items-center justify-between px-3 py-2 text-sm transition-colors ${on ? "bg-graphite text-gold" : "text-mute hover:text-bone"}`}>
                {n.label}{!n.live && <span className="ml-2 text-[9px] uppercase tracking-wider text-mute/70">Soon</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 lg:px-6">
          <form className="min-w-[180px] flex-1" role="search" onSubmit={(e) => { e.preventDefault(); router.push(`/members?search=${encodeURIComponent(q)}`); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members by name, phone or code" aria-label="Search members" className="input max-w-md" />
          </form>
          <ThemeToggle />
          <button onClick={logout} className="btn btn-ghost">Sign out</button>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
