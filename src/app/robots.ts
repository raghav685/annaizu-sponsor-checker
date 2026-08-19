import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /sync-status is deliberately NOT disallowed here - it relies on its own
    // noindex meta tag, which a crawler can only see by actually fetching the
    // page. Disallowing it in robots.txt would hide that signal instead of
    // reinforcing it.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${SITE_URL}/sitemap/0.xml`,
  };
}
