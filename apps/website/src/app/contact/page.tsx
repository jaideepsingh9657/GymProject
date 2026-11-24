import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import EnquiryForm from "@/components/EnquiryForm";
import Reveal from "@/components/Reveal";
import { PhotoPlaceholder } from "@/components/Section";
import { site, waLink } from "@/content/site";

export const metadata: Metadata = { title: "Contact", description: `Visit, call or WhatsApp ${site.name} in ${site.city}.` };

export default function Contact() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Come train with us." />
      <section className="py-24 sm:py-32">
        <div className="container-x grid gap-16 lg:grid-cols-2">
          <Reveal>
            <address className="not-italic text-mute"><p>{site.address}</p><p className="mt-2">{site.phone}</p></address>
            <dl className="mt-8 max-w-sm text-sm">
              {site.hours.map((h) => <div key={h.days} className="flex justify-between border-b border-line py-2"><dt className="text-mute">{h.days}</dt><dd>{h.time}</dd></div>)}
            </dl>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a href={waLink("Hi, I have a question.")} className="btn btn-gold">WhatsApp</a>
              <a href={site.googleMaps} className="btn btn-ghost">Directions</a>
            </div>
            <PhotoPlaceholder label="Google Map (embed once address is verified)" className="mt-10 aspect-video" />
          </Reveal>
          <Reveal delay={150}><h2 className="mb-8 font-display text-4xl">Send an enquiry</h2><EnquiryForm mode="contact" /></Reveal>
        </div>
      </section>
    </>
  );
}
