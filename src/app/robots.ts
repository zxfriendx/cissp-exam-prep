import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/quiz/", "/report/", "/progress/", "/unlock/"] }],
    sitemap: "https://learn.securepathdigital.net/sitemap.xml",
  };
}
