import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import GalleryGrid from "@/components/GalleryGrid";

export const metadata: Metadata = { title: "Gallery", description: "Inside Luxury Fitness Gym: interiors, equipment, training and events." };

export default function Gallery() {
  return (
    <>
      <PageHero eyebrow="Gallery" title="Inside the club." intro="Temporary generated images. Real photography replaces them once available." />
      <section className="py-20"><div className="container-x"><GalleryGrid /></div></section>
    </>
  );
}
