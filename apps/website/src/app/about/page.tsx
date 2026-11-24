import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import CtaBand from "@/components/CtaBand";
import Reveal from "@/components/Reveal";
import Parallax from "@/components/motion/Parallax";
import { PhotoPlaceholder, SectionHead } from "@/components/Section";
import { site, why } from "@/content/site";

export const metadata: Metadata = { title: "About", description: `The story, philosophy and standards behind ${site.name}.` };

export default function About() {
  return (
    <>
      <PageHero eyebrow="About" title="Built on discipline." intro="A training club with one belief: results come from standards, not slogans." />
      <section className="py-24 sm:py-32">
        <div className="container-x grid items-center gap-14 lg:grid-cols-2">
          <Parallax className="aspect-[4/5]"><PhotoPlaceholder label="Club interior" className="h-full" /></Parallax>
          <div>
            <SectionHead eyebrow="Our story" title="Why we built this club." />
            <Reveal delay={200} className="mt-8 space-y-5 text-mute">
              <p>Placeholder brand story. The owner’s real story, founding year and background will replace this text.</p>
              <p>We set out to bring an international standard of training, design and service to {site.city}.</p>
            </Reveal>
          </div>
        </div>
      </section>
      <section className="border-y border-line bg-charcoal py-24 sm:py-32">
        <div className="container-x grid gap-12 md:grid-cols-2">
          <Reveal className="border-t border-gold/50 pt-6"><p className="eyebrow">Mission</p><p className="mt-4 font-display text-3xl leading-snug">To make serious training accessible, measurable and enjoyable for every member.</p></Reveal>
          <Reveal delay={150} className="border-t border-gold/50 pt-6"><p className="eyebrow">Vision</p><p className="mt-4 font-display text-3xl leading-snug">The most trusted name in premium fitness across the region.</p></Reveal>
        </div>
      </section>
      <section className="py-24 sm:py-32">
        <div className="container-x">
          <SectionHead eyebrow="Philosophy" title="Why choose Luxury Fitness Gym?" />
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
      <CtaBand />
    </>
  );
}
