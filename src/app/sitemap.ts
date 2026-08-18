import type { MetadataRoute } from "next";
import { loadSponsorsServer } from "@/lib/serverData";

const SITE_URL = "https://uk-sponsors-explorer.example";
const CHUNK_SIZE = 40000; // stays under the 50,000-URL-per-sitemap limit

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

  if (id === 0) {
    return [{ url: SITE_URL, changeFrequency: "daily", priority: 1 }, ...sponsorUrls];
  }
  return sponsorUrls;
}
