"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/** Moves children vertically at a different rate than the page scroll. */
export default function Parallax({ children, className = "", distance = 60 }: { children: React.ReactNode; className?: string; distance?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-distance, distance]);
  return <div ref={ref} className={`overflow-hidden ${className}`}><motion.div style={{ y }} className="h-full scale-[1.15]">{children}</motion.div></div>;
}
