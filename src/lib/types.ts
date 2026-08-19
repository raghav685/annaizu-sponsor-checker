export type Region =
  | "London"
  | "South East"
  | "South West"
  | "East of England"
  | "East Midlands"
  | "West Midlands"
  | "North West"
  | "North East"
  | "Yorkshire and The Humber"
  | "Scotland"
  | "Wales"
  | "Northern Ireland"
  | "Unknown";

export type Sector =
  | "Health & Social Care"
  | "IT & Software"
  | "Education"
  | "Hospitality"
  | "Construction"
  | "Logistics & Transport"
  | "Finance & Professional Services"
  | "Recruitment & Staffing"
  | "Retail"
  | "Manufacturing & Engineering"
  | "Agriculture"
  | "Creative & Media"
  | "Charity & Religious"
  | "Public Sector"
  | "Other";

export type SponsorType = "Worker" | "Temporary Worker" | "Both";
export type Rating = "A" | "B" | "A & B" | "Unrated";

export interface Sponsor {
  id: string;
  name: string;
  town: string;
  county: string;
  region: Region;
  sector: Sector;
  routes: string[];
  routeCount: number;
  ratings: Array<"A" | "B">;
  rating: Rating;
  sponsorType: SponsorType;
  /** ISO date this sponsor first appeared on the register (per firstSeenAt in the DB). */
  firstSeenAt: string;
  /** "suspended" means currently active but has at least one prior "removed" event in its
   *  history (left the register and came back) - the one non-active-sounding label we can
   *  back with real data. "revoked" covers every current non-active status (withdrawn,
   *  closed, unknown) collapsed into one bucket; it's a deliberate label choice, not a claim
   *  we can verify the cause of (see DECISIONS.md). */
  status: "active" | "suspended" | "revoked";
  /** Verified official links only - null means "not yet looked up," never a guessed/search URL. */
  website: string | null;
  linkedin: string | null;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface Stats {
  totalSponsors: number;
  totalLicences: number;
  byRegion: Record<string, number>;
  bySector: Record<string, number>;
  byRoute: Record<string, number>;
  byRating: Record<string, number>;
  bySponsorType: Record<string, number>;
  topTowns: NamedCount[];
  topCounties: NamedCount[];
  abByRegion: Record<string, { a: number; b: number; both: number; unrated: number }>;
  routeBySector: Record<string, Record<string, number>>;
  routesPerSponsorHistogram: Record<string, number>;
}

export interface Meta {
  sourceUrl: string;
  csvUrl: string;
  csvFilename: string;
  govUkLastUpdated: string;
  rawRowCount: number;
  sponsorCount: number;
  unknownRegionCount: number;
  pipelineRunAt: string;
}

export interface SearchIndexEntry {
  id: string;
  name: string;
  town: string;
  region: Region;
}
