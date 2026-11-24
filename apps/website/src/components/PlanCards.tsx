"use client";
import { motion } from "motion/react";
import Reveal from "./Reveal";
import { plans, waLink } from "@/content/site";

export default function PlanCards() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {plans.map((p, i) => (
        <Reveal key={p.name} delay={i * 90} className="h-full">
          <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className={`flex h-full flex-col p-8 ${p.featured ? "border border-gold bg-ink" : "card"}`}>
            {p.featured && <span className="eyebrow mb-3">Most chosen</span>}
            <h3 className="font-display text-3xl">{p.name}</h3>
            <p className="text-sm text-mute">{p.duration}</p>
            <p className="mt-6 font-display text-4xl text-gold">{p.price}</p>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-bone/80">
              {p.features.map((f) => <li key={f} className="border-t border-line pt-2">{f}</li>)}
            </ul>
            <a href={waLink(`Hi, I'd like to know more about the ${p.name} membership.`)} className={`btn mt-8 ${p.featured ? "btn-gold" : "btn-ghost"}`}>Enquire</a>
          </motion.div>
        </Reveal>
      ))}
    </div>
  );
}
