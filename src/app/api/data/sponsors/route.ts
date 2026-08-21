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
    headers: {
      // `force-dynamic` makes Next.js normalise/strip a plain `Cache-Control` header down to
      // just its bare directive on the way out (verified against production: the s-maxage and
      // stale-while-revalidate this used to carry never survived, so every request was an
      // uncached MISS - confirmed via `x-vercel-cache: MISS` on consecutive requests seconds
      // apart, and a 4.3MB compressed payload behind every single one). `CDN-Cache-Control`
      // is a separate, CDN-only directive Next's normalisation doesn't touch, so it's what
      // actually reaches Vercel's edge cache. `Cache-Control` is kept conservative so a
      // downstream proxy or the browser itself never serves a stale copy past the edge.
      "CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
