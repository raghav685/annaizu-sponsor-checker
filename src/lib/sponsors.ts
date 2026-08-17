import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { Sponsor, SponsorDataset } from "@/types/sponsor";

const FULL_PATH = path.join(process.cwd(), "data", "sponsors.json");
const SAMPLE_PATH = path.join(process.cwd(), "data", "sponsors.sample.json");

let cached: SponsorDataset | null = null;
let cachedIsSample = false;

/**
 * `npm run ingest` fetches the live gov.uk register into data/sponsors.json.
 * TODO(annaizu): if that hasn't been run (fresh clone, no network in this
 * environment), we fall back to the bundled ~90-row sample so the UI still
 * works end-to-end — re-run ingest to get the real ~127k-sponsor register.
 */
export function getDataset(): SponsorDataset {
  if (cached) return cached;
  const useFull = existsSync(FULL_PATH);
  cached = JSON.parse(readFileSync(useFull ? FULL_PATH : SAMPLE_PATH, "utf-8")) as SponsorDataset;
  cachedIsSample = !useFull;
  return cached;
}

export function isSampleData(): boolean {
  getDataset();
  return cachedIsSample;
}

export interface SponsorSearchParams {
  q?: string;
  townCity?: string;
  county?: string;
  types?: string[];
  ratingTiers?: string[];
  routes?: string[];
  page?: number;
  pageSize?: number;
}

export interface SponsorSearchResult {
  sponsors: Sponsor[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function intersects(haystack: string[], needles: string[]): boolean {
  return haystack.some((h) => needles.includes(h));
}

export function searchSponsors(params: SponsorSearchParams): SponsorSearchResult {
  const dataset = getDataset();
  const q = params.q ? normalise(params.q) : "";
  const townCity = params.townCity ? normalise(params.townCity) : "";
  const county = params.county ? normalise(params.county) : "";
  const types = params.types?.filter(Boolean) ?? [];
  const ratingTiers = params.ratingTiers?.filter(Boolean) ?? [];
  const routes = params.routes?.filter(Boolean) ?? [];
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, params.pageSize ?? 20));

  const filtered = dataset.sponsors.filter((sponsor) => {
    if (q && !sponsor.organisationName.toLowerCase().includes(q)) return false;
    if (townCity && !sponsor.townCity.toLowerCase().includes(townCity)) return false;
    if (county && !(sponsor.county ?? "").toLowerCase().includes(county)) return false;
    if (types.length && !intersects(sponsor.types, types)) return false;
    if (ratingTiers.length && !intersects(sponsor.ratingTiers, ratingTiers)) return false;
    if (routes.length && !intersects(sponsor.routes, routes)) return false;
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const sponsors = filtered.slice(start, start + pageSize);

  return { sponsors, total, page, pageSize, totalPages };
}

export function getSponsorById(id: string): Sponsor | undefined {
  return getDataset().sponsors.find((s) => s.id === id);
}

export function getFacets() {
  const dataset = getDataset();
  return {
    townCities: dataset.townCities,
    counties: dataset.counties,
    routes: dataset.routes,
    ratingTiers: dataset.ratingTiers,
    types: dataset.types,
  };
}

export function getStats() {
  const dataset = getDataset();
  return {
    totalSponsors: dataset.totalSponsors,
    generatedAt: dataset.generatedAt,
    sourceUrl: dataset.sourceUrl,
    sourcePublicationUrl: dataset.sourcePublicationUrl,
    isSample: isSampleData(),
  };
}
