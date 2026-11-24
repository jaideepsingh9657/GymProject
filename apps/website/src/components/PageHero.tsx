import Reveal from "./Reveal";
import SplitText from "./motion/SplitText";

export default function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <section className="relative overflow-hidden border-b border-line pb-20 pt-40 sm:pt-48">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,#2a2415_0%,#0a0a0a_65%)]" aria-hidden />
      <div className="container-x relative">
        <Reveal><p className="eyebrow">{eyebrow}</p></Reveal>
        <SplitText as="h1" immediate text={title} className="mt-5 max-w-4xl font-display text-[clamp(2.8rem,8vw,6.5rem)] font-medium leading-[0.98]" />
        {intro && <Reveal delay={300}><p className="mt-8 max-w-xl text-lg text-bone/70">{intro}</p></Reveal>}
      </div>
    </section>
  );
}
