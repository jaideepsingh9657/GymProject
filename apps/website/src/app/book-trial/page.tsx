import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import EnquiryForm from "@/components/EnquiryForm";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = { title: "Book a Free Trial", description: "Book your free trial session at Luxury Fitness Gym." };

export default function BookTrial() {
  return (
    <>
      <PageHero eyebrow="Free trial" title="Your first session is on us." intro="Tell us a little about you and we will confirm a time." />
      <section className="py-24 sm:py-32">
        <div className="container-x max-w-xl"><Reveal><EnquiryForm mode="trial" /></Reveal></div>
      </section>
    </>
  );
}
