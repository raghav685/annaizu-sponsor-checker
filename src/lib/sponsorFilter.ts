/**
 * Server-side equivalent of the old client-side filter worker (workers/filter.worker.ts,
 * now removed) - matching/sorting logic is unchanged from what shipped there, just run once
 * per request in Node instead of per-browser in a Web Worker. Keeping the semantics identical
 * is the whole point: filters/search/sort must behave exactly as they did before pagination
 * was added (see /api/data/sponsors's DEFINITION OF DONE).
 */
import Fuse from "fuse.js";
import type { FilterState } from "./filterState";
import type { Sponsor } from "./types";

export const MAX_PAGE_SIZE = 500;

export function matchesFilters(s: Sponsor, f: FilterState): boolean {
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

export function sortSponsors(list: Sponsor[], sort: FilterState["sort"]): Sponsor[] {
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

/** Same Fuse config as the old worker: fuzzy match on name only. */
function search(sponsors: Sponsor[], query: string): Sponsor[] {
  const fuse = new Fuse(sponsors, { keys: ["name"], threshold: 0.32, includeScore: false });
  return fuse.search(query).map((r) => r.item);
}

export interface QuerySponsorsResult {
  matched: Sponsor[]; // every sponsor matching filters+search+sort, full set (not paginated)
}

/** Applies search, then filters, then sort - same order as the old worker's runQuery. */
export function querySponsors(sponsors: Sponsor[], filters: FilterState): QuerySponsorsResult {
  const base = filters.search.trim() ? search(sponsors, filters.search.trim()) : sponsors;
  const filtered = base.filter((s) => matchesFilters(s, filters));
  const sorted = filters.sort === "relevance" ? filtered : sortSponsors(filtered, filters.sort);
  return { matched: sorted };
}
