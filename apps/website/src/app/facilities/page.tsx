import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import CtaBand from "@/components/CtaBand";
import Reveal from "@/components/Reveal";
import Parallax from "@/components/motion/Parallax";
import { PhotoPlaceholder } from "@/components/Section";
import { facilityDetails } from "@/content/site";

export const metadata: Metadata = { title: "Facilities", description: "Strength, cardio, functional training and personal coaching zones." };

export default function Facilities() {
  return (
    <>
      <PageHero eyebrow="Facilities" title="Every zone, built for a purpose." intro="Facility details are indicative until confirmed by the owner." />
      <section className="py-24 sm:py-32">
        <div className="container-x space-y-24 sm:space-y-32">
          {facilityDetails.map((f, i) => (
            <div key={f.title} className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-20 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <Parallax className="aspect-[4/3]" distance={40}><PhotoPlaceholder label={f.title} className="h-full" /></Parallax>
              <Reveal>
                <p className="eyebrow">0{i + 1}</p>
                <h2 className="mt-3 font-display text-4xl sm:text-5xl">{f.title}</h2>
                <p className="mt-5 max-w-md text-mute">{f.body}</p>
                <ul className="mt-8 max-w-sm">{f.points.map((p) => <li key={p} className="border-t border-line py-3 text-sm">{p}</li>)}</ul>
              </Reveal>
            </div>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
