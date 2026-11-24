import Link from "next/link";
import Reveal from "./Reveal";
import Magnetic from "./motion/Magnetic";
import SplitText from "./motion/SplitText";

export default function CtaBand() {
  return (
    <section className="relative overflow-hidden border-t border-line bg-charcoal py-28 sm:py-36">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,#3a2f12_0%,transparent_60%)]" aria-hidden />
      <div className="container-x relative text-center">
        <SplitText text="Your first session is on us." className="mx-auto max-w-3xl font-display text-5xl leading-[1] sm:text-7xl" />
        <Reveal delay={300} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Magnetic><Link href="/book-trial" className="btn btn-gold">Book a Free Trial</Link></Magnetic>
          <Magnetic><Link href="/membership" className="btn btn-ghost">View Membership</Link></Magnetic>
        </Reveal>
      </div>
    </section>
  );
}
