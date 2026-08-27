import { NextResponse } from "next/server";
import { loadTownCountyFacets } from "@/lib/dataQueries";

// Global town/county option lists barely change between register syncs - cache on the same
// cadence as meta/stats rather than recomputing on every sidebar mount.
export const revalidate = 300;

export async function GET() {
  const facets = await loadTownCountyFacets();
  return NextResponse.json(facets);
}
