"use client";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import Reveal from "@/components/Reveal";
import CtaBand from "@/components/CtaBand";
import { PhotoPlaceholder, SectionHead } from "@/components/Section";
import PlanCards from "@/components/PlanCards";
import Marquee from "@/components/motion/Marquee";
import Magnetic from "@/components/motion/Magnetic";
import CountUp from "@/components/motion/CountUp";
import SplitText from "@/components/motion/SplitText";
import { facilities, marquee, site, stats, testimonials, trainers, waLink, why } from "@/content/site";

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee items={marquee} />
      <Intro />
      <Stats />
      <Facilities />
      <Why />
      <Trainers />
      <Plans />
      <Testimonials />
      <Social />
      <Contact />
      <CtaBand />
      <JsonLd />
    </>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  return (
    <section ref={ref} className="relative flex min-h-[100svh] items-end overflow-hidden pb-20 pt-32 sm:items-center sm:pb-0">
      <motion.div style={{ y: bgY }} className="absolute inset-0 -top-10" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#3a2f12_0%,#0a0a0a_62%)]" />
        <div className="absolute -right-40 top-10 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(201,162,75,0.28)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "repeating-linear-gradient(90deg,#f4f1ea 0 1px,transparent 1px 120px)" }} />
      </motion.div>
      <motion.div style={{ opacity: fade }} className="container-x relative">
        <Reveal><p className="eyebrow">{site.city} · Premium Fitness Club</p></Reveal>
        <SplitText as="h1" immediate delay={0.2} text="Train like it matters." className="mt-6 max-w-5xl font-display text-[clamp(3.2rem,10vw,9rem)] font-medium leading-[0.92]" />
        <Reveal delay={900}><p className="mt-8 max-w-xl text-lg text-bone/75">Serious equipment. Disciplined coaching. A club built for people who measure progress, not excuses.</p></Reveal>
        <Reveal delay={1100} className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Magnetic><Link href="/membership" className="btn btn-gold">Explore Membership</Link></Magnetic>
          <Magnetic><Link href="/book-trial" className="btn btn-ghost">Book a Free Trial</Link></Magnetic>
        </Reveal>
      </motion.div>
      <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex" aria-hidden>
        <span className="text-[10px] uppercase tracking-wider2 text-mute">Scroll</span>
        <motion.span className="block h-10 w-px bg-gold" animate={{ scaleY: [0, 1, 0], originY: [0, 0, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
      </div>
    </section>
  );
}

function Intro() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container-x grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Reveal><p className="eyebrow">The Club</p></Reveal>
          <SplitText as="p" text="Not a gym that fits everyone. A club that makes its members better." className="mt-6 font-display text-3xl leading-snug sm:text-4xl lg:text-5xl" />
        </div>
        <Reveal delay={200} className="text-mute lg:col-span-4 lg:col-start-9">
          <p>Luxury Fitness Gym brings an international standard of training to {site.city}: considered design, quality equipment and coaches who track what you do.</p>
          <Link href="/about" className="mt-6 inline-block text-xs uppercase tracking-[0.18em] text-gold hover:text-gold-soft">Our story →</Link>
        </Reveal>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="border-y border-line bg-charcoal">
      <div className="container-x grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x">
        {stats.map((s, i) => (
          <Reveal key={i} delay={i * 100} className="px-4 py-12 text-center lg:py-16">
            <p className="font-display text-6xl text-gold"><CountUp to={s.to} suffix={s.suffix} /></p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-mute">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Facilities() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead eyebrow="Facilities" title="Every zone, built for a purpose." />
          <Link href="/facilities" className="text-xs uppercase tracking-[0.18em] text-gold hover:text-gold-soft">All facilities →</Link>
        </div>
        <div className="mt-14 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {facilities.map((f, i) => (
            <Reveal key={f.title} delay={i * 90} className="bg-ink">
              <PhotoPlaceholder label={f.title} className="aspect-[4/5]" />
              <div className="p-6">
                <h3 className="font-display text-2xl">{f.title}</h3>
                <p className="mt-2 text-sm text-mute">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-xs text-mute">Facility list is indicative until confirmed by the owner.</p>
      </div>
    </section>
  );
}

function Why() {
  return (
    <section className="border-y border-line bg-charcoal py-24 sm:py-32">
      <div className="container-x">
        <SectionHead eyebrow="Why Luxury Fitness" title="The standard is the point." />
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {why.map((w, i) => (
            <Reveal key={w.n} delay={i * 120} className="border-t border-gold/50 pt-6">
              <span className="font-display text-5xl text-gold/80">{w.n}</span>
              <h3 className="mt-4 font-display text-2xl">{w.t}</h3>
              <p className="mt-3 text-sm text-mute">{w.b}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trainers() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead eyebrow="Coaches" title="Led by people who train." />
          <Link href="/trainers" className="text-xs uppercase tracking-[0.18em] text-gold hover:text-gold-soft">All trainers →</Link>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {trainers.map((t, i) => (
            <Reveal key={i} delay={i * 120}>
              <PhotoPlaceholder label="Trainer portrait" seed={`trainer${i}`} className="aspect-[3/4]" />
              <h3 className="mt-5 font-display text-2xl">{t.name}</h3>
              <p className="text-sm text-gold">{t.role}</p>
              <p className="text-sm text-mute">{t.spec}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Plans() {
  return (
    <section className="border-y border-line bg-charcoal py-24 sm:py-32" id="membership">
      <div className="container-x">
        <SectionHead eyebrow="Membership" title="Choose your commitment." intro="Prices are managed by the club. Ask us for current rates." />
        <div className="mt-14"><PlanCards /></div>
        <p className="mt-6 text-xs text-mute">Placeholder plans and prices. Final pricing will come from the admin dashboard.</p>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container-x">
        <SectionHead eyebrow="Members" title="In their words." />
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={i} delay={i * 120} className="card p-8">
              <p className="font-display text-2xl leading-snug">“{t.quote}”</p>
              <p className="mt-6 text-xs uppercase tracking-[0.18em] text-gold">{t.who}</p>
            </Reveal>
          ))}
        </div>
        <a href={site.googleReviews} className="mt-8 inline-block text-xs uppercase tracking-[0.18em] text-gold hover:text-gold-soft">Read our Google reviews →</a>
      </div>
    </section>
  );
}

function Social() {
  return (
    <section className="border-y border-line bg-charcoal py-24 sm:py-32">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead eyebrow="Instagram" title="Inside the club." />
          <a href={site.instagram} className="btn btn-ghost">Follow on Instagram</a>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((n, i) => <Reveal key={n} delay={i * 80}><PhotoPlaceholder label={`Gallery ${n}`} className="aspect-square" /></Reveal>)}
        </div>
        <p className="mt-6 text-xs text-mute">Gallery will load from the club’s official Instagram or an admin-managed set.</p>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container-x grid gap-12 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow="Visit" title="Come train with us." />
          <address className="mt-8 not-italic text-mute">
            <p>{site.address}</p>
            <p className="mt-2">{site.phone}</p>
          </address>
          <dl className="mt-8 max-w-sm space-y-2 text-sm">
            {site.hours.map((h) => (
              <div key={h.days} className="flex justify-between border-b border-line py-2"><dt className="text-mute">{h.days}</dt><dd>{h.time}</dd></div>
            ))}
          </dl>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a href={waLink("Hi, I'd like to book a free trial.")} className="btn btn-gold">WhatsApp Us</a>
            <a href={site.googleMaps} className="btn btn-ghost">Get Directions</a>
          </div>
        </div>
        <PhotoPlaceholder label="Google Map (embed once address is verified)" className="min-h-[320px]" />
      </div>
    </section>
  );
}

function JsonLd() {
  const data = {
    "@context": "https://schema.org", "@type": "HealthClub", name: site.name, url: site.url,
    address: { "@type": "PostalAddress", addressLocality: site.city, addressRegion: "Maharashtra", addressCountry: "IN" },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
