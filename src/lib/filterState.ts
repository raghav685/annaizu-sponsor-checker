import type { SortValue } from "./constants";

export type RatingFilter = "All" | "A" | "B" | "A & B";
export type SponsorTypeFilter = "All" | "Worker" | "Temporary Worker" | "Both";
export type Density = "comfortable" | "compact";

export interface FilterState {
  search: string;
  regions: string[];
  towns: string[];
  counties: string[];
  routes: string[];
  rating: RatingFilter;
  sponsorType: SponsorTypeFilter;
  sectors: string[];
  minRoutes: number;
  maxRoutes: number;
  aRatedOnly: boolean;
  multiRouteOnly: boolean;
  hideUnknownRegion: boolean;
  sort: SortValue;
  density: Density;
}

export const ROUTE_RANGE_CEILING = 8; // no sponsor in the register holds more than this many routes

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  regions: [],
  towns: [],
  counties: [],
  routes: [],
  rating: "All",
  sponsorType: "All",
  sectors: [],
  minRoutes: 1,
  maxRoutes: ROUTE_RANGE_CEILING,
  aRatedOnly: false,
  multiRouteOnly: false,
  hideUnknownRegion: false,
  sort: "relevance",
  density: "comfortable",
};

const LIST_KEYS: Array<keyof FilterState> = ["regions", "towns", "counties", "routes", "sectors"];

export function filtersToParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.search) p.set("q", f.search);
  if (f.regions.length) p.set("region", f.regions.join(","));
  if (f.towns.length) p.set("town", f.towns.join(","));
  if (f.counties.length) p.set("county", f.counties.join(","));
  if (f.routes.length) p.set("route", f.routes.join(","));
  if (f.rating !== "All") p.set("rating", f.rating);
  if (f.sponsorType !== "All") p.set("type", f.sponsorType);
  if (f.sectors.length) p.set("sector", f.sectors.join(","));
  if (f.minRoutes !== DEFAULT_FILTERS.minRoutes) p.set("minroutes", String(f.minRoutes));
  if (f.maxRoutes !== DEFAULT_FILTERS.maxRoutes) p.set("maxroutes", String(f.maxRoutes));
  if (f.aRatedOnly) p.set("arated", "1");
  if (f.multiRouteOnly) p.set("multi", "1");
  if (f.hideUnknownRegion) p.set("hideunknown", "1");
  if (f.sort !== "relevance") p.set("sort", f.sort);
  if (f.density !== "comfortable") p.set("density", f.density);
  return p;
}

export function paramsToFilters(p: URLSearchParams): FilterState {
  const listOf = (key: string) => {
    const v = p.get(key);
    return v ? v.split(",").filter(Boolean) : [];
  };
  return {
    search: p.get("q") ?? DEFAULT_FILTERS.search,
    regions: listOf("region"),
    towns: listOf("town"),
    counties: listOf("county"),
    routes: listOf("route"),
    rating: (p.get("rating") as RatingFilter) ?? DEFAULT_FILTERS.rating,
    sponsorType: (p.get("type") as SponsorTypeFilter) ?? DEFAULT_FILTERS.sponsorType,
    sectors: listOf("sector"),
    minRoutes: p.has("minroutes") ? Number(p.get("minroutes")) : DEFAULT_FILTERS.minRoutes,
    maxRoutes: p.has("maxroutes") ? Number(p.get("maxroutes")) : DEFAULT_FILTERS.maxRoutes,
    aRatedOnly: p.get("arated") === "1",
    multiRouteOnly: p.get("multi") === "1",
    hideUnknownRegion: p.get("hideunknown") === "1",
    sort: (p.get("sort") as SortValue) ?? DEFAULT_FILTERS.sort,
    density: (p.get("density") as Density) ?? DEFAULT_FILTERS.density,
  };
}

export function activeFilterCount(f: FilterState): number {
  let n = 0;
  if (f.search) n++;
  for (const key of LIST_KEYS) n += (f[key] as string[]).length;
  if (f.rating !== "All") n++;
  if (f.sponsorType !== "All") n++;
  if (f.minRoutes !== DEFAULT_FILTERS.minRoutes || f.maxRoutes !== DEFAULT_FILTERS.maxRoutes) n++;
  if (f.aRatedOnly) n++;
  if (f.multiRouteOnly) n++;
  if (f.hideUnknownRegion) n++;
  return n;
}
