/// <reference lib="webworker" />
import Fuse from "fuse.js";
import type { Sponsor, Stats } from "../lib/types";
import type { FilterState } from "../lib/filterState";
import { ALL_REGIONS } from "../lib/constants";

let sponsors: Sponsor[] = [];
let fuse: Fuse<Sponsor> | null = null;

function buildStats(subset: Sponsor[]): Stats {
  const countBy = (values: string[]): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const v of values) out[v] = (out[v] ?? 0) + 1;
    return out;
  };

  const byRegion = countBy(subset.map((s) => s.region));
  const bySector = countBy(subset.map((s) => s.sector));
  const byRating = countBy(subset.map((s) => s.rating));
  const bySponsorType = countBy(subset.map((s) => s.sponsorType));
  const byRoute = countBy(subset.flatMap((s) => s.routes));

  const townCounts = new Map<string, number>();
  const countyCounts = new Map<string, number>();
  for (const s of subset) {
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
  for (const s of subset) {
    const bucket = abByRegion[s.region] ?? (abByRegion[s.region] = { a: 0, b: 0, both: 0, unrated: 0 });
    if (s.rating === "A") bucket.a++;
    else if (s.rating === "B") bucket.b++;
    else if (s.rating === "A & B") bucket.both++;
    else bucket.unrated++;
  }

  const routeBySector: Stats["routeBySector"] = {};
  for (const s of subset) {
    routeBySector[s.sector] ??= {};
    for (const r of s.routes) routeBySector[s.sector][r] = (routeBySector[s.sector][r] ?? 0) + 1;
  }

  const routesPerSponsorHistogram: Record<string, number> = {};
  for (const s of subset) {
    routesPerSponsorHistogram[s.routeCount] = (routesPerSponsorHistogram[s.routeCount] ?? 0) + 1;
  }

  return {
    totalSponsors: subset.length,
    totalLicences: subset.reduce((sum, s) => sum + s.routeCount, 0),
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

function matchesFilters(s: Sponsor, f: FilterState): boolean {
  if (f.regions.length && !f.regions.includes(s.region)) return false;
  if (f.towns.length && !f.towns.includes(s.town)) return false;
  if (f.counties.length && !f.counties.includes(s.county)) return false;
  if (f.routes.length && !s.routes.some((r) => f.routes.includes(r))) return false;
  if (f.sectors.length && !f.sectors.includes(s.sector)) return false;
  if (f.rating !== "All" && s.rating !== f.rating) return false;
  if (f.sponsorType !== "All" && s.sponsorType !== f.sponsorType) return false;
  if (s.routeCount < f.minRoutes || s.routeCount > f.maxRoutes) return false;
  if (f.aRatedOnly && !s.ratings.includes("A")) return false;
  if (f.multiRouteOnly && s.routeCount <= 1) return false;
  if (f.hideUnknownRegion && s.region === "Unknown") return false;
  return true;
}

function sortSponsors(list: Sponsor[], sort: FilterState["sort"]): Sponsor[] {
  switch (sort) {
    case "az":
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    case "za":
      return [...list].sort((a, b) => b.name.localeCompare(a.name));
    case "mostRoutes":
      return [...list].sort((a, b) => b.routeCount - a.routeCount || a.name.localeCompare(b.name));
    case "townAz":
      return [...list].sort((a, b) => a.town.localeCompare(b.town) || a.name.localeCompare(b.name));
    default:
      return list;
  }
}

function runQuery(filters: FilterState) {
  let base: Sponsor[];
  if (filters.search.trim()) {
    base = (fuse?.search(filters.search.trim()) ?? []).map((r) => r.item);
  } else {
    base = sponsors;
  }

  const filtered = base.filter((s) => matchesFilters(s, filters));
  const sorted = filters.sort === "relevance" ? filtered : sortSponsors(filtered, filters.sort);
  const stats = buildStats(filtered);

  return { ids: sorted.map((s) => s.id), stats };
}

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type === "init") {
    sponsors = msg.sponsors as Sponsor[];
    fuse = new Fuse(sponsors, { keys: ["name"], threshold: 0.32, includeScore: false });
    (self as unknown as Worker).postMessage({ type: "ready" });
    return;
  }
  if (msg.type === "query") {
    const { ids, stats } = runQuery(msg.filters as FilterState);
    (self as unknown as Worker).postMessage({ type: "result", requestId: msg.requestId, ids, stats });
  }
};

export {};
