import Link from "next/link";
import { nav, site } from "@/content/site";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-charcoal">
      <div className="container-x grid gap-12 py-16 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl">LUXURY <span className="text-gold">FITNESS</span></p>
          <p className="mt-4 max-w-xs text-sm text-mute">{site.tagline} A premium training club in {site.city}.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-3 text-sm text-mute">
          {nav.map((n) => <Link key={n.href} href={n.href} className="hover:text-gold">{n.label}</Link>)}
        </nav>
        <div className="text-sm text-mute">
          <p>{site.address}</p>
          <p className="mt-2">{site.phone}</p>
          <p className="mt-4"><a href={site.instagram} className="hover:text-gold">Instagram</a></p>
        </div>
      </div>
      <div className="border-t border-line py-6 text-center text-xs text-mute">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </div>
    </footer>
  );
}
