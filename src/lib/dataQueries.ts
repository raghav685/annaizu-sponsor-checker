/**
 * Shared server-side queries backing every page/route that used to read
 * public/data/*.json. Nothing here reads from disk - it's all live DB state,
 * so every figure traces back to a sync run.
 */
import { unstable_cache } from "next/cache";
import { and, asc, count, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { sponsors, sponsorRoutes, sponsorEvents, syncRuns } from "@/db/schema";
import type { Sponsor, Stats, Meta, Region, Sector, Rating, SponsorType } from "./types";
import { ALL_REGIONS } from "./constants";
import { slugify } from "./slug";

interface RouteRow {
  route: string;
  rating: "A" | "B" | null;
  sponsorType: "Worker" | "Temporary Worker";
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

type SponsorRow = typeof sponsors.$inferSelect;

/**
 * Attaches current routes to a set of sponsor rows and maps to the shape the
 * frontend has always consumed. `id` here is the stable `slug` (not the DB
 * uuid) - that's what /sponsor/[slug] and every existing component already
 * expect as an opaque identifier/URL segment. Shared by every loader below so
 * "active sponsors", "sponsors in a city", "sponsors on a route" etc. never
 * drift into slightly different shapes.
 */
// Above this many rows, an `inArray(...)` filter on sponsor id would build a WHERE IN
// with one entry per row - large enough (the full ~127k active set, or a single
// dominant route like "Skilled Worker") to blow the query builder's call stack.
// Past the threshold it's cheaper and safer to just load every current route.
const INARRAY_ROW_LIMIT = 5000;

/**
 * A currently-active sponsor that has at least one `removed` event in its
 * history left the register at some point and came back - the one presentation
 * status we can honestly call "suspended" without asserting a cause we don't
 * know (unlike "revoked", which is a deliberate label choice on data we can't
 * fully verify - see DECISIONS.md). Cached because it's a full-table scan of
 * sponsor_events, not something to redo on every request.
 */
// Returns a plain array, not a Set - unstable_cache round-trips its result through
// JSON, and JSON.stringify(new Set(...)) silently produces "{}".
const loadReactivatedSponsorIdList = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await db.selectDistinct({ sponsorId: sponsorEvents.sponsorId }).from(sponsorEvents).where(eq(sponsorEvents.eventType, "removed"));
    return rows.map((r) => r.sponsorId);
  },
  ["reactivated-sponsor-ids"],
  { revalidate: 300 }
);

async function hydrateSponsorRows(rows: SponsorRow[], reactivatedIds?: Set<string>): Promise<Sponsor[]> {
  if (rows.length === 0) return [];
  const currentRoutes = await db
    .select()
    .from(sponsorRoutes)
    .where(
      rows.length > INARRAY_ROW_LIMIT
        ? eq(sponsorRoutes.isCurrent, true)
        : and(eq(sponsorRoutes.isCurrent, true), inArray(sponsorRoutes.sponsorId, rows.map((r) => r.id)))
    );

  const routesBySponsorId = new Map<string, RouteRow[]>();
  for (const r of currentRoutes) {
    const list = routesBySponsorId.get(r.sponsorId) ?? [];
    list.push({ route: r.route, rating: r.rating as "A" | "B" | null, sponsorType: r.sponsorType as "Worker" | "Temporary Worker" });
    routesBySponsorId.set(r.sponsorId, list);
  }

  return rows.map((s) => {
    const routes = routesBySponsorId.get(s.id) ?? [];
    const ratings = routes.map((r) => r.rating).filter((r): r is "A" | "B" => r !== null);
    const sponsorTypeSet = new Set(routes.map((r) => r.sponsorType));
    return {
      id: s.slug,
      name: s.displayName,
      town: s.town,
      county: s.county,
      region: s.region as Region,
      sector: s.sector as Sector,
      routes: routes.map((r) => r.route),
      routeCount: routes.length,
      ratings,
      rating: deriveRating(ratings),
      sponsorType: deriveSponsorType(sponsorTypeSet),
      firstSeenAt: new Date(s.firstSeenAt).toISOString(),
      status: s.status !== "active" ? "revoked" : reactivatedIds?.has(s.id) ? "suspended" : "active",
      website: s.website,
      linkedin: s.linkedin,
      companiesHouse: s.companiesHouseMatchedAt
        ? {
            number: s.companiesHouseNumber,
            matchConfidence: s.companiesHouseMatchConfidence !== null ? Number(s.companiesHouseMatchConfidence) : null,
            matchedAt: new Date(s.companiesHouseMatchedAt).toISOString(),
            matchedOn: s.companiesHouseMatchedOn,
            needsReview: s.companiesHouseNeedsReview,
            incorporatedAt: s.companiesHouseIncorporatedAt,
            registeredOffice: s.companiesHouseRegisteredOffice,
            companyType: s.companiesHouseCompanyType,
          }
        : null,
    };
  });
}

/** The full set of active sponsors - see hydrateSponsorRows for the shape. */
export async function loadActiveSponsorsForFrontend(): Promise<Sponsor[]> {
  const [activeSponsors, reactivatedIdList] = await Promise.all([db.select().from(sponsors).where(eq(sponsors.status, "active")), loadReactivatedSponsorIdList()]);
  return hydrateSponsorRows(activeSponsors, new Set(reactivatedIdList));
}

/**
 * Sponsors no longer on the register (status != active), presented as a single "revoked"
 * bucket regardless of the underlying withdrawn/closed/unknown split - see DECISIONS.md's
 * "Outstanding commitment" entry for why this must never be worded as confirmed licence loss.
 * Kept separate from the active loader/store rather than blended in, so the site's core stats
 * and filters stay exactly "active sponsors only".
 */
export async function loadRemovedSponsorsForFrontend(): Promise<Sponsor[]> {
  const removed = await db.select().from(sponsors).where(ne(sponsors.status, "active"));
  return hydrateSponsorRows(removed);
}

export async function loadSponsorsByCity(city: string): Promise<Sponsor[]> {
  const rows = await db
    .select()
    .from(sponsors)
    .where(and(eq(sponsors.town, city), eq(sponsors.status, "active")));
  return hydrateSponsorRows(rows);
}

export async function loadSponsorsBySector(sector: string): Promise<Sponsor[]> {
  const rows = await db
    .select()
    .from(sponsors)
    .where(and(eq(sponsors.sector, sector), eq(sponsors.status, "active")));
  return hydrateSponsorRows(rows);
}

export async function loadSponsorsByRoute(route: string): Promise<Sponsor[]> {
  const rows = await db
    .select({ sponsor: sponsors })
    .from(sponsorRoutes)
    .innerJoin(sponsors, eq(sponsorRoutes.sponsorId, sponsors.id))
    .where(and(eq(sponsorRoutes.route, route), eq(sponsorRoutes.isCurrent, true), eq(sponsors.status, "active")));
  return hydrateSponsorRows(rows.map((r) => r.sponsor));
}

export interface BrowseIndexEntry {
  slug: string;
  name: string;
  count: number;
}

/**
 * Counts backing the /browse hub and each index page's generateStaticParams -
 * direct GROUP BY aggregates rather than loading all ~127k active sponsors,
 * since this also runs once per city/sector/route at build time.
 */
export async function loadBrowseIndex(): Promise<{
  cities: BrowseIndexEntry[];
  sectors: BrowseIndexEntry[];
  routes: BrowseIndexEntry[];
}> {
  const [cityRows, sectorRows, routeRows] = await Promise.all([
    db.select({ name: sponsors.town, count: count() }).from(sponsors).where(eq(sponsors.status, "active")).groupBy(sponsors.town),
    db.select({ name: sponsors.sector, count: count() }).from(sponsors).where(eq(sponsors.status, "active")).groupBy(sponsors.sector),
    db
      .select({ name: sponsorRoutes.route, count: count() })
      .from(sponsorRoutes)
      .innerJoin(sponsors, eq(sponsorRoutes.sponsorId, sponsors.id))
      .where(and(eq(sponsorRoutes.isCurrent, true), eq(sponsors.status, "active")))
      .groupBy(sponsorRoutes.route),
  ]);

  const toEntries = (rows: { name: string; count: number }[]): BrowseIndexEntry[] =>
    rows.map((r) => ({ slug: slugify(r.name), name: r.name, count: r.count })).sort((a, b) => b.count - a.count);

  return { cities: toEntries(cityRows), sectors: toEntries(sectorRows), routes: toEntries(routeRows) };
}

/**
 * Global (unfiltered) town/county option lists with counts, for the sidebar's typeahead
 * pickers - these must list every town/county in the active dataset regardless of the
 * current filter selection, unlike Stats.topTowns/topCounties (top-25 of the FILTERED set).
 */
export async function loadTownCountyFacets(): Promise<{
  towns: { name: string; count: number }[];
  counties: { name: string; count: number }[];
}> {
  const [townRows, countyRows] = await Promise.all([
    db.select({ name: sponsors.town, count: count() }).from(sponsors).where(eq(sponsors.status, "active")).groupBy(sponsors.town),
    db.select({ name: sponsors.county, count: count() }).from(sponsors).where(eq(sponsors.status, "active")).groupBy(sponsors.county),
  ]);
  const sortDesc = (rows: { name: string; count: number }[]) => rows.filter((r) => r.name).sort((a, b) => b.count - a.count);
  return { towns: sortDesc(townRows), counties: sortDesc(countyRows) };
}

export interface TownCoverageRow {
  town: string;
  region: string;
  sector: string;
  count: number;
}

/**
 * Fine-grained (town, region, sector) counts for the /map coverage page -
 * shipped to the client as one flat table so region/sector filtering there
 * is a cheap client-side reduce rather than a round-trip per filter change.
 */
export async function loadTownCoverage(): Promise<TownCoverageRow[]> {
  return db
    .select({ town: sponsors.town, region: sponsors.region, sector: sponsors.sector, count: count() })
    .from(sponsors)
    .where(eq(sponsors.status, "active"))
    .groupBy(sponsors.town, sponsors.region, sponsors.sector);
}

export interface KpiSummary {
  activeCount: number;
  historyBeginsAt: string | null;
  latestPublish: {
    registerDate: string | null;
    finishedAt: string | null;
    addedCount: number;
    removedCount: number;
    updatedCount: number;
  } | null;
}

/**
 * Per DECISIONS.md "KPI tiles / history charts: no withdrawn/closed split
 * until Companies House lands" - callers must render `removedCount` as a
 * single "removed from register" figure, never split or labelled "revoked".
 */
export async function loadKpiSummary(): Promise<KpiSummary> {
  const [{ activeCount }] = await db.select({ activeCount: count() }).from(sponsors).where(eq(sponsors.status, "active"));

  const [latestPublish, earliestRun] = await Promise.all([
    db.query.syncRuns.findFirst({
      where: (t, { inArray: inArr }) => inArr(t.status, ["success", "no_change"]),
      orderBy: [desc(syncRuns.startedAt)],
    }),
    db.query.syncRuns.findFirst({
      where: (t, { inArray: inArr }) => inArr(t.status, ["success", "no_change"]),
      orderBy: [asc(syncRuns.startedAt)],
    }),
  ]);

  return {
    activeCount,
    historyBeginsAt: earliestRun?.startedAt ? new Date(earliestRun.startedAt).toISOString() : null,
    latestPublish: latestPublish
      ? {
          registerDate: latestPublish.registerPublicUpdatedAt ? new Date(latestPublish.registerPublicUpdatedAt).toISOString() : null,
          finishedAt: latestPublish.finishedAt ? new Date(latestPublish.finishedAt).toISOString() : null,
          addedCount: latestPublish.sponsorsAddedCount ?? 0,
          removedCount: latestPublish.sponsorsRemovedCount ?? 0,
          updatedCount: latestPublish.sponsorsUpdatedCount ?? 0,
        }
      : null,
  };
}

export function buildStatsFromSponsors(sponsorList: Sponsor[]): Stats {
  const countBy = (values: string[]): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const v of values) out[v] = (out[v] ?? 0) + 1;
    return out;
  };

  const byRegion = countBy(sponsorList.map((s) => s.region));
  const bySector = countBy(sponsorList.map((s) => s.sector));
  const byRating = countBy(sponsorList.map((s) => s.rating));
  const bySponsorType = countBy(sponsorList.map((s) => s.sponsorType));
  const byRoute = countBy(sponsorList.flatMap((s) => s.routes));

  const townCounts = new Map<string, number>();
  const countyCounts = new Map<string, number>();
  for (const s of sponsorList) {
    if (s.town) townCounts.set(s.town, (townCounts.get(s.town) ?? 0) + 1);
    if (s.county) countyCounts.set(s.county, (countyCounts.get(s.county) ?? 0) + 1);
  }
  const top = (m: Map<string, number>, n: number) =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({ name, count }));

  const abByRegion: Stats["abByRegion"] = {};
  for (const region of ALL_REGIONS) abByRegion[region] = { a: 0, b: 0, both: 0, unrated: 0 };
  for (const s of sponsorList) {
    const bucket = abByRegion[s.region] ?? (abByRegion[s.region] = { a: 0, b: 0, both: 0, unrated: 0 });
    if (s.rating === "A") bucket.a++;
    else if (s.rating === "B") bucket.b++;
    else if (s.rating === "A & B") bucket.both++;
    else bucket.unrated++;
  }

  const routeBySector: Stats["routeBySector"] = {};
  for (const s of sponsorList) {
    routeBySector[s.sector] ??= {};
    for (const r of s.routes) routeBySector[s.sector][r] = (routeBySector[s.sector][r] ?? 0) + 1;
  }

  const routesPerSponsorHistogram: Record<string, number> = {};
  for (const s of sponsorList) {
    routesPerSponsorHistogram[s.routeCount] = (routesPerSponsorHistogram[s.routeCount] ?? 0) + 1;
  }

  return {
    totalSponsors: sponsorList.length,
    totalLicences: sponsorList.reduce((sum, s) => sum + s.routeCount, 0),
    byRegion,
    bySector,
    byRoute,
    byRating,
    bySponsorType,
    topTowns: top(townCounts, 25),
    topCounties: top(countyCounts, 25),
    abByRegion,
    routeBySector,
    routesPerSponsorHistogram,
  };
}

// Wrapped in Next's persistent Data Cache (unstable_cache), not just React's
// request-scoped cache() - this is called from the root layout (sitewide
// footer) plus the homepage, methodology, and all ~6,800 statically-generated
// browse/city|industry|route pages. React's cache() only dedupes within one
// render pass; each of those thousands of static pages is a SEPARATE build-time
// render, so without a cache that survives across them, a full build meant
// thousands of extra sequential round-trips to the production DB. This way the
// underlying query runs at most once per revalidate window, at build time too.
export const loadMetaForFrontend = unstable_cache(
  async function loadMetaForFrontend(): Promise<Meta> {
  const lastRun = await db.query.syncRuns.findFirst({
    where: (t, { inArray: inArr }) => inArr(t.status, ["success", "no_change"]),
    orderBy: [desc(syncRuns.startedAt)],
  });

  const [{ activeCount }] = await db.select({ activeCount: count() }).from(sponsors).where(eq(sponsors.status, "active"));
  const [{ unknownRegionCount }] = await db
    .select({ unknownRegionCount: count() })
    .from(sponsors)
    .where(and(eq(sponsors.status, "active"), eq(sponsors.region, "Unknown")));

  return {
    sourceUrl: "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers",
    csvUrl: lastRun?.csvUrl ?? "",
    csvFilename: lastRun?.csvFilename ?? "",
    govUkLastUpdated: lastRun?.registerPublicUpdatedAt
      ? new Date(lastRun.registerPublicUpdatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "",
    rawRowCount: lastRun?.rowCount ?? 0,
    sponsorCount: activeCount,
    unknownRegionCount,
    pipelineRunAt: lastRun?.finishedAt ? new Date(lastRun.finishedAt).toISOString() : "",
    };
  },
  ["load-meta-for-frontend"],
  { revalidate: 300 }
);
