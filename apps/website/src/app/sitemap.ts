import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/facilities", "/membership", "/trainers", "/gallery", "/contact", "/book-trial"].map((p) => ({
    url: `${site.url}${p}`,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
}
