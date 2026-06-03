import type { MetadataRoute } from "next";
import { absoluteUrl, extraSeoPages, publicSeoPages } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [...publicSeoPages, ...extraSeoPages].map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
