import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import CtaBand from "@/components/CtaBand";
import Reveal from "@/components/Reveal";
import { PhotoPlaceholder } from "@/components/Section";
import { trainers } from "@/content/site";

export const metadata: Metadata = { title: "Trainers", description: "Meet the coaches at Luxury Fitness Gym." };

export default function Trainers() {
  return (
    <>
      <PageHero eyebrow="Coaches" title="Led by people who train." intro="Placeholder profiles. Real names, qualifications and experience will be added once supplied." />
      <section className="py-24 sm:py-32">
        <div className="container-x grid gap-12 md:grid-cols-3">
          {trainers.map((t, i) => (
            <Reveal key={i} delay={i * 120}>
              <PhotoPlaceholder label="Trainer portrait" seed={`trainer${i}`} className="aspect-[3/4]" />
              <h2 className="mt-6 font-display text-3xl">{t.name}</h2>
              <p className="text-gold">{t.role}</p>
              <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
                <div className="flex justify-between py-2"><dt className="text-mute">Specialization</dt><dd>{t.spec}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-mute">Qualifications</dt><dd>To be added</dd></div>
                <div className="flex justify-between py-2"><dt className="text-mute">Experience</dt><dd>To be added</dd></div>
              </dl>
            </Reveal>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
