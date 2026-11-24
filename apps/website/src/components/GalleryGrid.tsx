"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { PhotoPlaceholder } from "./Section";
import { gallery } from "@/content/site";

const cats = ["All", "Interior", "Equipment", "Training", "Events", "Transformations"];

export default function GalleryGrid() {
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<number | null>(null);
  const items = gallery.map((g, i) => ({ ...g, i })).filter((g) => cat === "All" || g.cat === cat);

  useEffect(() => {
    if (open === null) return;
    const on = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open]);

  return (
    <>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Gallery filter">
        {cats.map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
            className={`relative px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition-colors ${cat === c ? "text-ink" : "text-mute hover:text-gold"}`}>
            {cat === c && <motion.span layoutId="pill" className="absolute inset-0 bg-gold" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <span className="relative">{c}</span>
          </button>
        ))}
      </div>
      <LayoutGroup>
        <motion.div layout className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {items.map((g) => (
              <motion.button key={g.i} layout layoutId={`g${g.i}`} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} onClick={() => setOpen(g.i)}
                className={`text-left ${g.i % 5 === 0 ? "row-span-2" : ""}`} aria-label={`Open ${g.label}`}>
                <PhotoPlaceholder label={g.label} seed={`gal${g.i}`} className={g.i % 5 === 0 ? "h-full min-h-[22rem]" : "aspect-square"} />
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
      <AnimatePresence>
        {open !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/95 p-5" role="dialog" aria-modal="true" aria-label={gallery[open].label}>
            <motion.div layoutId={`g${open}`} className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
              <PhotoPlaceholder label={gallery[open].label} seed={`gal${open}`} className="aspect-[4/3]" />
              <p className="mt-4 font-display text-2xl">{gallery[open].label} <span className="text-sm text-gold">· {gallery[open].cat}</span></p>
            </motion.div>
            <button onClick={() => setOpen(null)} className="absolute right-5 top-5 p-3 text-xs uppercase tracking-[0.18em] text-bone hover:text-gold" autoFocus>Close ✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
