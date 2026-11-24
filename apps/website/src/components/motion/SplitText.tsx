"use client";
import { motion, useReducedMotion } from "motion/react";

/** Word-by-word masked rise. `as` picks the heading level. */
export default function SplitText({ text, className = "", as: Tag = "h2", delay = 0, immediate = false }: {
  text: string; className?: string; as?: "h1" | "h2" | "h3" | "p"; delay?: number; immediate?: boolean;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const Comp = motion[Tag];
  return (
    <Comp
      className={className}
      aria-label={text}
      initial="hidden"
      {...(immediate ? { animate: "show" } : { whileInView: "show", viewport: { once: true, margin: "-60px" } })}
      transition={{ staggerChildren: 0.07, delayChildren: delay }}
    >
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            variants={{ hidden: reduce ? {} : { y: "110%" }, show: { y: 0 } }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </Comp>
  );
}
