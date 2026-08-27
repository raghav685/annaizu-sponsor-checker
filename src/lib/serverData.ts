import { eq, and, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { sponsors, sponsorRoutes } from "@/db/schema";
import { loadActiveSponsorsForFrontend } from "./dataQueries";
import type { Sponsor, Region, Sector, Rating, SponsorType } from "./types";

/**
 * Full active-sponsor list, for the sitemap only - everything else here does a targeted query.
 * Memoized for the lifetime of the process: `sitemap.ts` calls this once in generateSitemaps()
 * to count chunks, then once again per chunk (4 more calls for ~127k sponsors) - unmemoized,
 * that's 5 full ~40MB fetches of the same data on every single build. `next.config.ts` pins
 * static generation to a single worker (`experimental.cpus: 1`, originally for a PGlite
 * concurrency issue), so all of those calls land in the same process and this cache actually
 * dedupes them - confirmed as a real contributor to Supabase's data-transfer quota being
 * exhausted mid-build (production `PostgresError 53000`, 2026-08-21).
 */
let cachedSponsors: Promise<Sponsor[]> | null = null;
export function loadSponsorsServer(): Promise<Sponsor[]> {
  if (!cachedSponsors) cachedSponsors = loadActiveSponsorsForFrontend();
  return cachedSponsors;
}

function deriveRating(ratings: Array<"A" | "B">): Rating {
  const unique = Array.from(new Set(ratings));
  if (unique.length === 2) return "A & B";
  if (unique.length === 1) return unique[0];
  return "Unrated";
}

function deriveSponsorType(types: Set<"Worker" | "Temporary Worker">): SponsorType {
  if (types.size === 2) return "Both";
  return (Array.from(types)[0] as SponsorType) ?? "Worker";
}

export async function getSponsorBySlug(slug: string): Promise<Sponsor | undefined> {
  const row = await db.query.sponsors.findFirst({ where: eq(sponsors.slug, slug) });
  if (!row || row.status !== "active") return undefined;

  const routes = await db.select().from(sponsorRoutes).where(and(eq(sponsorRoutes.sponsorId, row.id), eq(sponsorRoutes.isCurrent, true)));
  const ratings = routes.map((r) => r.rating).filter((r): r is "A" | "B" => r !== null);

  return {
    id: row.slug,
    name: row.displayName,
    town: row.town,
    county: row.county,
    region: row.region as Region,
    sector: row.sector as Sector,
    routes: routes.map((r) => r.route),
    routeCount: routes.length,
    ratings,
    rating: deriveRating(ratings),
    sponsorType: deriveSponsorType(new Set(routes.map((r) => r.sponsorType as "Worker" | "Temporary Worker"))),
    firstSeenAt: new Date(row.firstSeenAt).toISOString(),
    status: "active",
    website: row.website,
    linkedin: row.linkedin,
    companiesHouse: null,
  };
}

export async function getOtherSponsorsInTown(town: string, excludeSlug: string, limit = 8): Promise<Sponsor[]> {
  const rows = await db
    .select()
    .from(sponsors)
    .where(and(eq(sponsors.town, town), eq(sponsors.status, "active"), ne(sponsors.slug, excludeSlug)))
    .limit(limit);

  const results: Sponsor[] = [];
  for (const row of rows) {
    const routes = await db.select().from(sponsorRoutes).where(and(eq(sponsorRoutes.sponsorId, row.id), eq(sponsorRoutes.isCurrent, true)));
    const ratings = routes.map((r) => r.rating).filter((r): r is "A" | "B" => r !== null);
    results.push({
      id: row.slug,
      name: row.displayName,
      town: row.town,
      county: row.county,
      region: row.region as Region,
      sector: row.sector as Sector,
      routes: routes.map((r) => r.route),
      routeCount: routes.length,
      ratings,
      rating: deriveRating(ratings),
      sponsorType: deriveSponsorType(new Set(routes.map((r) => r.sponsorType as "Worker" | "Temporary Worker"))),
      firstSeenAt: new Date(row.firstSeenAt).toISOString(),
      status: "active",
      website: row.website,
      linkedin: row.linkedin,
      companiesHouse: null,
    });
  }
  return results;
}
