/**
 * Thin client for the Companies House public data API
 * (https://developer.company-information.service.gov.uk/). Auth is HTTP
 * Basic with the API key as the username and an empty password - that's the
 * documented scheme, not a mistake.
 */
const BASE_URL = "https://api.company-information.service.gov.uk";

export interface CompanySearchResult {
  company_number: string;
  title: string; // company name
  company_status?: string;
  address_snippet?: string;
}

export interface CompanyProfile {
  company_number: string;
  company_name: string;
  company_status: string; // 'active' | 'dissolved' | 'liquidation' | 'administration' | 'receivership' | 'voluntary-arrangement' | ...
  // Confirmed against Companies House's own companyProfile resource schema
  // (developer-specs.company-information.service.gov.uk) - the field is genuinely just
  // `type`, not `company_type` like company_status/company_number/company_name would suggest.
  type?: string; // 'ltd' | 'plc' | 'llp' | 'community-interest-company' | ...
  date_of_creation?: string; // incorporation date, YYYY-MM-DD
  sic_codes?: string[];
  date_of_cessation?: string;
  registered_office_address?: Record<string, string>;
}

/** Flattens Companies House's address object into the single line the frontend displays. */
export function formatRegisteredOffice(address: Record<string, string> | undefined): string | null {
  if (!address) return null;
  const parts = [
    address.premises,
    address.address_line_1,
    address.address_line_2,
    address.locality,
    address.region,
    address.postal_code,
    address.country,
  ].filter((p): p is string => Boolean(p && p.trim()));
  return parts.length > 0 ? parts.join(", ") : null;
}

function authHeader(): string {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) throw new Error("COMPANIES_HOUSE_API_KEY is not set.");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2; // transient errors only (429/5xx/timeout/network) - never for 4xx client errors
const RETRY_BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function chFetchOnce<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: authHeader(), Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new CompaniesHouseTransientError(`Companies House API request timed out after ${REQUEST_TIMEOUT_MS}ms for ${path}`);
    }
    throw new CompaniesHouseTransientError(`Companies House API network error for ${path}: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 404) return null;
  if (res.status === 429) {
    throw new CompaniesHouseRateLimitError("Companies House API rate limit hit (HTTP 429).");
  }
  if (res.status >= 500) {
    throw new CompaniesHouseTransientError(`Companies House API returned ${res.status} ${res.statusText} for ${path}`);
  }
  if (!res.ok) {
    // 400/401/403: permanent for this request (bad query, bad/expired key, forbidden) - never retried.
    throw new Error(`Companies House API returned ${res.status} ${res.statusText} for ${path}`);
  }
  try {
    return (await res.json()) as T;
  } catch (err) {
    throw new Error(`Companies House API returned a malformed (non-JSON) response for ${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Retries only transient failures (timeout/network/5xx) with short backoff. 429 and 4xx are never retried here - see callers. */
async function chFetch<T>(path: string): Promise<T | null> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await chFetchOnce<T>(path);
    } catch (err) {
      lastErr = err;
      if (!(err instanceof CompaniesHouseTransientError) || attempt === MAX_RETRIES) throw err;
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }
  throw lastErr;
}

export class CompaniesHouseRateLimitError extends Error {}
/** Timeout, network failure, or HTTP 5xx - worth a bounded retry, unlike a bad request or bad key. */
export class CompaniesHouseTransientError extends Error {}

export async function searchCompanies(name: string): Promise<CompanySearchResult[]> {
  const data = await chFetch<{ items: CompanySearchResult[] }>(`/search/companies?q=${encodeURIComponent(name)}&items_per_page=5`);
  return data?.items ?? [];
}

export async function getCompanyProfile(companyNumber: string): Promise<CompanyProfile | null> {
  return chFetch<CompanyProfile>(`/company/${encodeURIComponent(companyNumber)}`);
}

/** Maps a Companies House company_status to our sponsor status bucket. */
export function classifyCompanyStatus(status: string): "withdrawn" | "closed" {
  const closedStatuses = new Set(["dissolved", "liquidation", "administration", "receivership", "insolvency-proceedings", "converted-closed"]);
  return closedStatuses.has(status) ? "closed" : "withdrawn";
}
