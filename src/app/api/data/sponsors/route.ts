import { NextResponse } from "next/server";
import { loadActiveSponsorsForFrontend } from "@/lib/dataQueries";

// The full active-sponsor list is ~38MB as JSON - too large for Next's ISR cache
// storage (19MB cap; discovered as a real deploy failure, not a hypothetical), so
// this can't use `revalidate`. Cached at the CDN edge via Cache-Control instead,
// which has no such size ceiling and still avoids re-querying ~127k rows on every
// request; the response is still gzip/brotli-compressed in transit as normal.
export const dynamic = "force-dynamic";

export async function GET() {
  const sponsorsList = await loadActiveSponsorsForFrontend();
  return NextResponse.json(sponsorsList, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
