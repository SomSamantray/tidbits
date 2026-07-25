import type { MetadataRoute } from "next";
import { getSiteAssetUrl, getSiteUrl } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: getSiteAssetUrl("/sitemap.xml").toString(),
    host: getSiteUrl().toString(),
  };
}
