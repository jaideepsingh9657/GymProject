import Reveal from "./Reveal";
import SplitText from "./motion/SplitText";

export function SectionHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="max-w-2xl">
      <Reveal><p className="eyebrow">{eyebrow}</p></Reveal>
      <SplitText text={title} className="mt-4 font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl" />
      {intro && <Reveal delay={200}><p className="mt-5 text-mute">{intro}</p></Reveal>}
    </div>
  );
}

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Dummy image: generated abstract art (no external assets), clearly labelled.
 * Replace with real photography via next/image once available.
 */
export function PhotoPlaceholder({ label, className = "", seed }: { label: string; className?: string; seed?: string }) {
  const h = hash(seed ?? label);
  const angle = h % 360;
  const cx = 20 + (h % 60);
  const cy = 15 + ((h >> 3) % 50);
  const r = 28 + ((h >> 5) % 30);
  const id = `g${h}`;
  return (
    <div className={`group relative overflow-hidden border border-line bg-graphite ${className}`} role="img" aria-label={`Placeholder image: ${label}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full transition-transform duration-[1200ms] ease-out group-hover:scale-110" aria-hidden>
        <defs>
          <linearGradient id={id} gradientTransform={`rotate(${angle} .5 .5)`}>
            <stop offset="0" stopColor="#2b2410" /><stop offset=".55" stopColor="#141414" /><stop offset="1" stopColor="#0a0a0a" />
          </linearGradient>
          <radialGradient id={`${id}r`}><stop offset="0" stopColor="#c9a24b" stopOpacity=".55" /><stop offset="1" stopColor="#c9a24b" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${id})`} />
        <circle cx={cx} cy={cy} r={r} fill={`url(#${id}r)`} />
        <g stroke="#c9a24b" strokeOpacity=".14" strokeWidth=".3">
          {Array.from({ length: 9 }, (_, i) => <line key={i} x1={i * 14 - 20} y1="110" x2={i * 14 + 30} y2="-10" />)}
        </g>
        <path d={`M0 ${70 + (h % 20)} Q ${30 + (h % 30)} ${50 + (h % 25)} 100 ${75 - (h % 20)} V100 H0Z`} fill="#0a0a0a" fillOpacity=".55" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
      <span className="absolute bottom-3 left-4 text-[10px] uppercase tracking-wider2 text-bone/50">Temporary · {label}</span>
    </div>
  );
}
