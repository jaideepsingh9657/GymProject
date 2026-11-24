import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import CtaBand from "@/components/CtaBand";
import PlanCards from "@/components/PlanCards";
import ComparisonTable from "@/components/ComparisonTable";
import { SectionHead } from "@/components/Section";

export const metadata: Metadata = { title: "Membership", description: "Monthly, quarterly, half-yearly and annual membership plans." };

export default function Membership() {
  return (
    <>
      <PageHero eyebrow="Membership" title="Choose your commitment." intro="Plans and prices below are placeholders; final pricing is managed by the club." />
      <section className="py-24 sm:py-32"><div className="container-x"><PlanCards /></div></section>
      <section className="border-y border-line bg-charcoal py-24 sm:py-32">
        <div className="container-x">
          <SectionHead eyebrow="Compare" title="What each plan includes." />
          <div className="mt-14"><ComparisonTable /></div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
