import type { MetadataRoute } from "next";

/* Static export: this is written once at build as /sitemap.xml. Only the two
   pages a search should land on are listed. The quiz, study, report, progress
   and unlock routes are app screens, and robots.ts keeps crawlers out of them. */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://learn.securepathdigital.net";
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/practice/`, lastModified, changeFrequency: "weekly", priority: 0.9 },
  ];
}
