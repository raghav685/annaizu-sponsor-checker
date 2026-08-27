import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { companiesHouseCache } from "@/db/schema";
import { searchCompanies, getCompanyProfile, formatRegisteredOffice, type CompanySearchResult, type CompanyProfile } from "./client";

const CACHE_TTL_DAYS = 30;
// Companies House's documented limit is 600 requests / 5 minutes per key.
// Each cache-miss lookup makes up to 2 real requests (search + profile), so
// capping at 250 *lookups* (not requests) per window stays safely under 600
// even in the worst case where every lookup needs both calls.
export const RATE_LIMIT_WINDOW_MINUTES = 5;
export const RATE_LIMIT_MAX_LOOKUPS = 250;

export interface CachedLookup {
  matchedCompanyNumber: string | null;
  matchedCompanyName: string | null;
  companyStatus: string | null;
  sicCodes: string[] | null;
  incorporatedAt: string | null;
  registeredOffice: string | null;
  companyType: string | null;
  fromCache: boolean;
}

/** Counts cache-miss lookups (real API calls) made in the current rate-limit window. */
export async function lookupsUsedInWindow(): Promise<number> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000);
  const [{ c }] = await db
    .select({ c: count() })
    .from(companiesHouseCache)
    .where(gt(companiesHouseCache.fetchedAt, windowStart));
  return c;
}

async function getFreshCacheEntry(queryName: string) {
  const rows = await db
    .select()
    .from(companiesHouseCache)
    .where(and(eq(companiesHouseCache.queryName, queryName), gt(companiesHouseCache.expiresAt, sql`now()`)))
    .orderBy(desc(companiesHouseCache.fetchedAt))
    .limit(1);
  const row = rows[0] ?? null;
  if (!row) return null;
  // A row written before incorporatedAt/registeredOffice/companyType existed on this table
  // has a real match (matchedCompanyNumber set) but null profile fields - not distinguishable
  // from "genuinely has no profile data" by column value alone. Treating it as fresh would
  // silently perpetuate the gap for its full 30-day TTL, since a match writes whatever
  // resolveCompanyForName returns straight back onto the sponsor row. Force a miss so it
  // re-fetches once and gets backfilled for real.
  //
  // companyType specifically (not incorporatedAt/registeredOffice) also catches rows written
  // during the brief window this session had the wrong Companies House API field name
  // (`company_type` instead of the real `type`) - confirmed live: 3 sponsors matched in that
  // window have a real incorporatedAt but companyType stuck null. `type` is present on every
  // real company profile CH returns, so a matched row missing only it is never legitimate.
  const looksIncomplete = row.matchedCompanyNumber !== null && !row.companyType;
  return looksIncomplete ? null : row;
}

/**
 * Resolves a single name variant to a best-guess company, searching then
 * fetching the top candidate's full profile (for company_status + SIC).
 * Cached for CACHE_TTL_DAYS so repeat lookups (e.g. re-processing the same
 * unmatched sponsor) don't burn rate-limit budget.
 */
export async function resolveCompanyForName(queryName: string): Promise<CachedLookup> {
  const cached = await getFreshCacheEntry(queryName);
  if (cached) {
    return {
      matchedCompanyNumber: cached.matchedCompanyNumber,
      matchedCompanyName: cached.matchedCompanyName,
      companyStatus: cached.companyStatus,
      sicCodes: cached.sicCodes,
      incorporatedAt: cached.incorporatedAt,
      registeredOffice: cached.registeredOffice,
      companyType: cached.companyType,
      fromCache: true,
    };
  }

  const results: CompanySearchResult[] = await searchCompanies(queryName);
  const top = results[0] ?? null;
  let profile: CompanyProfile | null = null;
  if (top) profile = await getCompanyProfile(top.company_number);

  const incorporatedAt = profile?.date_of_creation ?? null;
  const registeredOffice = formatRegisteredOffice(profile?.registered_office_address);
  const companyType = profile?.type ?? null;

  await db.insert(companiesHouseCache).values({
    queryName,
    matchedCompanyNumber: top?.company_number ?? null,
    matchedCompanyName: top?.title ?? null,
    companyStatus: profile?.company_status ?? top?.company_status ?? null,
    sicCodes: profile?.sic_codes ?? null,
    incorporatedAt,
    registeredOffice,
    companyType,
    rawResponse: { search: results, profile },
    expiresAt: new Date(Date.now() + CACHE_TTL_DAYS * 86_400_000),
  });

  return {
    matchedCompanyNumber: top?.company_number ?? null,
    matchedCompanyName: top?.title ?? null,
    companyStatus: profile?.company_status ?? top?.company_status ?? null,
    sicCodes: profile?.sic_codes ?? null,
    incorporatedAt,
    registeredOffice,
    companyType,
    fromCache: false,
  };
}
