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
  sic_codes?: string[];
  date_of_cessation?: string;
  registered_office_address?: Record<string, string>;
}

function authHeader(): string {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) throw new Error("COMPANIES_HOUSE_API_KEY is not set.");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

async function chFetch<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: authHeader(), Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (res.status === 429) {
    throw new CompaniesHouseRateLimitError("Companies House API rate limit hit (HTTP 429).");
  }
  if (!res.ok) {
    throw new Error(`Companies House API returned ${res.status} ${res.statusText} for ${path}`);
  }
  return (await res.json()) as T;
}

export class CompaniesHouseRateLimitError extends Error {}

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
