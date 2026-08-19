import type { Metadata } from "next";
import { SITE_URL } from "./site";

const SITE_NAME = "annaizu Sponsor Checker";

/**
 * Every indexable route builds its metadata through this so canonical/OG/Twitter
 * are never silently missing (they were, everywhere, before this) and every page
 * has a real self-referencing canonical instead of none at all.
 */
export function buildMetadata({
  title,
  description,
  path,
  robots,
}: {
  title: string;
  description: string;
  /** Pathname (and query string, for self-canonicalising a paginated page) - no origin. */
  path: string;
  robots?: Metadata["robots"];
}): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image", title, description },
    ...(robots ? { robots } : {}),
  };
}

export interface Crumb {
  label: string;
  href: string;
}

export function breadcrumbListSchema(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `${SITE_URL}${c.href}`,
    })),
  };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "annaizu",
    url: "https://www.annaizu.com/",
    logo: `${SITE_URL}/brand/annaizu-logo.png`,
  };
}
