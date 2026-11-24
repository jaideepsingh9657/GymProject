import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/motion/ScrollProgress";

const display = Cormorant_Garamond({
  subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-display", display: "swap",
});
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | Premium Gym in ${site.city}`, template: `%s | ${site.name}` },
  description: `${site.name}: a premium fitness club in ${site.city}. Strength, cardio, functional training and personal coaching.`,
  openGraph: { title: site.name, description: site.tagline, type: "website", locale: "en_IN" },
  alternates: { canonical: "/" },
};
export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-gold focus:px-4 focus:py-2 focus:text-ink">
          Skip to content
        </a>
        <ScrollProgress />
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
