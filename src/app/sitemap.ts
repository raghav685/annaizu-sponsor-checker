import type { MetadataRoute } from "next";
import { loadSponsorsServer } from "@/lib/serverData";
import { loadBrowseIndex } from "@/lib/dataQueries";
import { SITE_URL } from "@/lib/site";

const CHUNK_SIZE = 40000; // stays under the 50,000-URL-per-sitemap limit

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/sponsors", changeFrequency: "daily", priority: 0.9 },
  { path: "/map", changeFrequency: "weekly", priority: 0.7 },
  { path: "/browse", changeFrequency: "weekly", priority: 0.6 },
  { path: "/changelog", changeFrequency: "daily", priority: 0.6 },
  { path: "/methodology", changeFrequency: "monthly", priority: 0.5 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.5 },
  { path: "/verify", changeFrequency: "monthly", priority: 0.5 },
  { path: "/about", changeFrequency: "monthly", priority: 0.4 },
];

export async function generateSitemaps() {
  const sponsors = await loadSponsorsServer();
  const chunks = Math.max(1, Math.ceil(sponsors.length / CHUNK_SIZE));
  return Array.from({ length: chunks }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const sponsors = await loadSponsorsServer();
  const slice = sponsors.slice(id * CHUNK_SIZE, (id + 1) * CHUNK_SIZE);

  const sponsorUrls: MetadataRoute.Sitemap = slice.map((s) => ({
    url: `${SITE_URL}/sponsor/${s.id}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  if (Number(id) === 0) {
    const staticUrls: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
      url: `${SITE_URL}${r.path}`,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    }));

    // Real landing pages (Section 14) - each has its own useful list + intro,
    // not a filter/search variant, so they belong in the sitemap alongside the
    // static routes and sponsor detail pages.
    const { cities, sectors, routes } = await loadBrowseIndex();
    const browseUrls: MetadataRoute.Sitemap = [
      ...cities.map((c) => ({ url: `${SITE_URL}/browse/city/${encodeURIComponent(c.name)}`, changeFrequency: "weekly" as const, priority: 0.4 })),
      ...sectors.map((s) => ({ url: `${SITE_URL}/browse/industry/${s.slug}`, changeFrequency: "weekly" as const, priority: 0.4 })),
      ...routes.map((r) => ({ url: `${SITE_URL}/browse/route/${encodeURIComponent(r.name)}`, changeFrequency: "weekly" as const, priority: 0.4 })),
    ];

    return [{ url: SITE_URL, changeFrequency: "daily", priority: 1 }, ...staticUrls, ...browseUrls, ...sponsorUrls];
  }
  return sponsorUrls;
}
