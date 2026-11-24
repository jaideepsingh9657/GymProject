"use client";
import { motion, useReducedMotion } from "motion/react";

export default function Marquee({ items, speed = 38 }: { items: string[]; speed?: number }) {
  const reduce = useReducedMotion();
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-line py-6" aria-hidden>
      <motion.div
        className="flex w-max gap-12 whitespace-nowrap"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
      >
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-12 font-display text-4xl text-bone/20 sm:text-6xl">
            {t}<span className="text-gold/60">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
