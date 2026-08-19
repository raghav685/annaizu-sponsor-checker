import { eq, and, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { sponsors, sponsorRoutes } from "@/db/schema";
import { loadActiveSponsorsForFrontend } from "./dataQueries";
import type { Sponsor, Region, Sector, Rating, SponsorType } from "./types";

/** Full active-sponsor list, for the sitemap only - everything else here does a targeted query. */
export function loadSponsorsServer(): Promise<Sponsor[]> {
  return loadActiveSponsorsForFrontend();
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
    });
  }
  return results;
}
