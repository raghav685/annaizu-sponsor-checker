import type { Region, Sector } from "./types";
import { slugify } from "./slug";

export const ALL_REGIONS: Region[] = [
  "London",
  "South East",
  "South West",
  "East of England",
  "East Midlands",
  "West Midlands",
  "North West",
  "North East",
  "Yorkshire and The Humber",
  "Scotland",
  "Wales",
  "Northern Ireland",
  "Unknown",
];

export const ALL_SECTORS: Sector[] = [
  "Health & Social Care",
  "IT & Software",
  "Education",
  "Hospitality",
  "Construction",
  "Logistics & Transport",
  "Finance & Professional Services",
  "Recruitment & Staffing",
  "Retail",
  "Manufacturing & Engineering",
  "Agriculture",
  "Creative & Media",
  "Charity & Religious",
  "Public Sector",
  "Other",
];

// Sector is a closed enum guaranteed by the ingestion pipeline (unlike town/route,
// which are open-world strings straight from the register CSV) - safe to build a
// static slug -> Sector reverse map for /browse/industry/[slug] URLs.
export const SECTOR_BY_SLUG: Record<string, Sector> = Object.fromEntries(ALL_SECTORS.map((s) => [slugify(s), s]));

// Route -> Worker/Temporary Worker grouping for the sidebar checkbox group.
// Based on the actual Home Office route categorisation (Worker = points-based,
// longer-term; Temporary Worker = T5, time-limited). Anything unrecognised
// (data-entry typos in the register) falls into "Other" rather than guessing.
export const ROUTE_GROUP: Record<string, "Worker" | "Temporary Worker" | "Other"> = {
  "Skilled Worker": "Worker",
  "Global Business Mobility: Senior or Specialist Worker": "Worker",
  "Global Business Mobility: Graduate Trainee": "Worker",
  "Global Business Mobility: UK Expansion Worker": "Worker",
  "Global Business Mobility: Service Supplier": "Worker",
  "Global Business Mobility: Secondment Worker": "Worker",
  "Tier 2 Ministers of Religion": "Worker",
  "International Sportsperson": "Worker",
  "Scale-up": "Worker",
  "Creative Worker": "Temporary Worker",
  "Charity Worker": "Temporary Worker",
  "Religious Worker": "Temporary Worker",
  "Government Authorised Exchange": "Temporary Worker",
  "International Agreement": "Temporary Worker",
  "Seasonal Worker": "Temporary Worker",
};

export function routeGroupOf(route: string): "Worker" | "Temporary Worker" | "Other" {
  return ROUTE_GROUP[route] ?? "Other";
}

export const RATING_OPTIONS = ["All", "A", "B", "A & B"] as const;
export const SPONSOR_TYPE_OPTIONS = ["All", "Worker", "Temporary Worker", "Both"] as const;
export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "az", label: "A to Z" },
  { value: "za", label: "Z to A" },
  { value: "mostRoutes", label: "Most routes first" },
  { value: "townAz", label: "Town A to Z" },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
