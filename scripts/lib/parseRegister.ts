import Papa from "papaparse";
import { resolveRegion, type Region } from "./regions";
import { inferSector, type Sector } from "./sectors";
import { titleCaseDisplay, cleanWhitespace } from "./text";
import { buildMatchKey } from "./matchKey";

export type SponsorType = "Worker" | "Temporary Worker";
export type Rating = "A" | "B";

export interface StagingRoute {
  route: string;
  rating: Rating | null;
  sponsorType: SponsorType;
}

export interface StagingSponsor {
  matchKey: string;
  displayName: string;
  town: string;
  county: string;
  region: Region;
  sector: Sector;
  routes: StagingRoute[];
  // Every distinct raw organisation-name spelling that was merged into this
  // identity (see the merge step below). Persisted on the sponsor record so
  // a merge can be inspected or reversed later - e.g. if Companies House
  // matching finds two variants resolve to different company numbers.
  nameVariants: string[];
}

export interface ParseResult {
  sponsors: StagingSponsor[];
  rawRowCount: number;
  skippedBlankOrg: number;
  headers: string[];
}

function findColumn(headers: string[], mustContain: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9&]/g, "");
  const target = norm(mustContain);
  const found = headers.find((h) => norm(h).includes(target));
  if (!found) {
    throw new Error(
      `Expected a column matching "${mustContain}" but none was found.\n` +
        `Actual headers in the CSV: ${JSON.stringify(headers)}`
    );
  }
  return found;
}

function parseTypeAndRating(raw: string): { sponsorType: SponsorType | null; rating: Rating | null } {
  const cleaned = cleanWhitespace(raw);
  let sponsorType: SponsorType | null = null;
  if (/^temporary worker/i.test(cleaned)) sponsorType = "Temporary Worker";
  else if (/^worker/i.test(cleaned)) sponsorType = "Worker";

  const ratingMatch = cleaned.match(/\(([AB])\b/i);
  const rating = ratingMatch ? (ratingMatch[1].toUpperCase() as Rating) : null;

  return { sponsorType, rating };
}

interface Accumulator {
  orgNameRaw: string;
  townRaw: string;
  countyRaw: string;
  routes: Map<string, StagingRoute>; // keyed by `${route}|${rating}|${sponsorType}`
}

export function parseRegisterCsv(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields ?? [];
  const colOrg = findColumn(headers, "organisation name");
  const colTown = findColumn(headers, "town");
  const colCounty = findColumn(headers, "county");
  const colTypeRating = findColumn(headers, "type & rating");
  const colRoute = findColumn(headers, "route");

  const groups = new Map<string, Accumulator>();
  let skippedBlankOrg = 0;

  for (const row of parsed.data) {
    const orgNameRaw = cleanWhitespace(row[colOrg] ?? "");
    if (!orgNameRaw) {
      skippedBlankOrg++;
      continue;
    }
    const townRaw = cleanWhitespace(row[colTown] ?? "");
    const countyRaw = cleanWhitespace(row[colCounty] ?? "");
    const typeRatingRaw = row[colTypeRating] ?? "";
    const routeRaw = cleanWhitespace(row[colRoute] ?? "");

    const { sponsorType, rating } = parseTypeAndRating(typeRatingRaw);
    if (!sponsorType) continue; // malformed/placeholder row

    const groupKey = `${orgNameRaw.toLowerCase()}|${townRaw.toLowerCase()}|${countyRaw.toLowerCase()}`;
    let group = groups.get(groupKey);
    if (!group) {
      group = { orgNameRaw, townRaw, countyRaw, routes: new Map() };
      groups.set(groupKey, group);
    }
    if (routeRaw) {
      const routeKey = `${routeRaw}|${rating ?? ""}|${sponsorType}`;
      group.routes.set(routeKey, { route: routeRaw, rating, sponsorType });
    }
  }

  // First pass grouped by raw text, but distinct raw spellings/casing of the
  // same organisation in the same town (e.g. "AAB Business And Tax Advisory"
  // vs "AAB BUSINESS AND TAX ADVISORY LLP") normalise to the same match_key -
  // merge those now so the sync's (match_key, town) natural key never sees
  // a collision within a single parse. Genuinely different towns under the
  // same name (multi-branch operators) are kept as separate sponsors.
  const merged = new Map<string, StagingSponsor>();
  for (const group of groups.values()) {
    const displayName = titleCaseDisplay(group.orgNameRaw);
    const town = titleCaseDisplay(group.townRaw);
    const county = titleCaseDisplay(group.countyRaw);
    const matchKey = buildMatchKey(group.orgNameRaw);
    const identityKey = `${matchKey}::${town}`;

    const existing = merged.get(identityKey);
    if (existing) {
      for (const r of group.routes.values()) {
        const routeKey = `${r.route}|${r.rating ?? ""}|${r.sponsorType}`;
        if (!existing.routes.some((er) => `${er.route}|${er.rating ?? ""}|${er.sponsorType}` === routeKey)) {
          existing.routes.push(r);
        }
      }
      if (!existing.nameVariants.includes(group.orgNameRaw)) existing.nameVariants.push(group.orgNameRaw);
      continue;
    }
    merged.set(identityKey, {
      matchKey,
      displayName,
      town,
      county,
      region: resolveRegion(group.townRaw, group.countyRaw),
      sector: inferSector(displayName),
      routes: Array.from(group.routes.values()),
      nameVariants: [group.orgNameRaw],
    });
  }

  return { sponsors: Array.from(merged.values()), rawRowCount: parsed.data.length, skippedBlankOrg, headers };
}
