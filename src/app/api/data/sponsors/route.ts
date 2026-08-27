import { NextRequest, NextResponse } from "next/server";
import { loadActiveSponsorsForFrontend, buildStatsFromSponsors } from "@/lib/dataQueries";
import { querySponsors, MAX_PAGE_SIZE } from "@/lib/sponsorFilter";
import { paramsToFilters } from "@/lib/filterState";
import type { Sponsor } from "@/lib/types";

export const dynamic = "force-dynamic";

const NO_INDEX_HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

const DEFAULT_PAGE_SIZE = 100;
// Bulk CSV export (Sidebar's "Export CSV") is a distinct, explicit action from paginated
// browsing - it bypasses the per-page cap on purpose, but still isn't unbounded.
const MAX_EXPORT_ROWS = 50_000;

// The DB round trip + route hydration this wraps is the same query every request used to pay
// for anyway (previously to build the ~30-40MB payload shipped to the browser on every page
// load - the actual bug pagination fixes). Caching it means repeated filter/sort/page
// requests don't re-hit Postgres each time. NOT unstable_cache: Next's Data Cache rejects
// anything over 2MB (confirmed in dev - this array is ~50MB), so a plain in-process cache
// with its own TTL is used instead, same pattern as serverData.ts's cachedSponsors.
const CACHE_TTL_MS = 120_000;
let cache: { data: Promise<Sponsor[]>; expiresAt: number } | null = null;

function loadActiveSponsorsCached(): Promise<Sponsor[]> {
  if (!cache || cache.expiresAt < Date.now()) {
    const data = loadActiveSponsorsForFrontend();
    // A transient DB failure must not poison every request for the rest of the TTL window -
    // clear the entry so the next call retries instead of re-throwing the same rejection.
    data.catch(() => {
      if (cache?.data === data) cache = null;
    });
    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  }
  return cache.data;
}

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const n = value ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const filters = paramsToFilters(params);

  // "active" (Active tab) / "suspended" (labelled "Revoked" in the UI - see ConsoleShell)
  // narrow the active-sponsor set by the same computed status ResultsGrid used to filter by
  // client-side. Omit to get every active-status sponsor (both tabs combined).
  const statusFilter = params.get("status");

  const allSponsors = await loadActiveSponsorsCached();
  const scoped: Sponsor[] = statusFilter ? allSponsors.filter((s) => s.status === statusFilter) : allSponsors;

  const { matched } = querySponsors(scoped, filters);

  if (params.get("all") === "1") {
    // Bulk export path: every matching row (capped), no pagination.
    const rows = matched.slice(0, MAX_EXPORT_ROWS);
    return NextResponse.json({ rows, total: matched.length, truncated: matched.length > MAX_EXPORT_ROWS }, { headers: NO_INDEX_HEADERS });
  }

  const pageSize = clampInt(params.get("pageSize"), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const total = matched.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = clampInt(params.get("page"), 1, 1, pageCount);

  const start = (page - 1) * pageSize;
  const rows = matched.slice(start, start + pageSize);
  const stats = buildStatsFromSponsors(matched);

  return NextResponse.json(
    { rows, total, page, pageSize, pageCount, stats },
    { headers: NO_INDEX_HEADERS }
  );
}
