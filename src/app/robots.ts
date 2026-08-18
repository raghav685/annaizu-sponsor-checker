import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/sync-status"] },
    sitemap: "https://uk-sponsors-explorer.example/sitemap/0.xml",
  };
}
