import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import CtaBand from "@/components/CtaBand";
import Reveal from "@/components/Reveal";
import { PhotoPlaceholder } from "@/components/Section";
import { trainers as placeholders } from "@/content/site";

export const metadata: Metadata = { title: "Trainers", description: "Meet the coaches at Luxury Fitness Gym." };

interface PublicTrainer { name: string; qualifications: string | null; specializations: string[]; experienceYears: number | null; bio: string | null }

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Real trainers from the backend; null means "use the placeholder profiles" (API down or none added yet). */
async function loadTrainers(): Promise<PublicTrainer[] | null> {
  try {
    const r = await fetch(`${API}/v1/public/trainers`, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) && j.length > 0 ? j : null;
  } catch {
    return null;
  }
}

export default async function Trainers() {
  const real = await loadTrainers();
  const list: PublicTrainer[] = real ?? placeholders.map((t) => ({ name: t.name, qualifications: null, specializations: [t.spec], experienceYears: null, bio: null }));

  return (
    <>
      <PageHero eyebrow="Coaches" title="Led by people who train." intro={real ? undefined : "Placeholder profiles. Real names, qualifications and experience will be added once supplied."} />
      <section className="py-24 sm:py-32">
        <div className="container-x grid gap-12 md:grid-cols-3">
          {list.map((t, i) => (
            <Reveal key={`${t.name}-${i}`} delay={i * 120}>
              <PhotoPlaceholder label="Trainer portrait" seed={`trainer${i % 3}`} className="aspect-[3/4]" />
              <h2 className="mt-6 font-display text-3xl">{t.name}</h2>
              {t.specializations.length > 0 && <p className="text-gold">{t.specializations.join(" · ")}</p>}
              <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
                <div className="flex justify-between gap-4 py-2"><dt className="text-mute">Qualifications</dt><dd className="text-right">{t.qualifications ?? "To be added"}</dd></div>
                <div className="flex justify-between gap-4 py-2"><dt className="text-mute">Experience</dt><dd>{t.experienceYears !== null ? `${t.experienceYears} years` : "To be added"}</dd></div>
              </dl>
              {t.bio && <p className="mt-4 text-sm text-mute">{t.bio}</p>}
            </Reveal>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
