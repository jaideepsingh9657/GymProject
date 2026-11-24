import Reveal from "./Reveal";

export function SectionHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-4 font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">{title}</h2>
      {intro && <p className="mt-5 text-mute">{intro}</p>}
    </Reveal>
  );
}

/** Clearly labelled temporary image panel until real photography exists. */
export function PhotoPlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`relative flex items-end overflow-hidden border border-line bg-gradient-to-br from-graphite to-charcoal ${className}`} role="img" aria-label={`Placeholder: ${label}`}>
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "repeating-linear-gradient(45deg,#c9a24b 0 1px,transparent 1px 14px)" }} />
      <span className="relative m-4 text-[10px] uppercase tracking-wider2 text-mute">Temporary · {label}</span>
    </div>
  );
}
