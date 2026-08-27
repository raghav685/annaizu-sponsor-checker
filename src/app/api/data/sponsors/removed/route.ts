import { NextRequest, NextResponse } from "next/server";
import { loadRemovedSponsorsForFrontend } from "@/lib/dataQueries";
import { MAX_PAGE_SIZE } from "@/lib/sponsorFilter";

// Cached on the same cadence as the active list rather than the default no-cache, since it's
// driven by the same sync cycle.
export const revalidate = 300;

const DEFAULT_PAGE_SIZE = 100;

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const n = value ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const removed = await loadRemovedSponsorsForFrontend();

  const pageSize = clampInt(params.get("pageSize"), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const total = removed.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = clampInt(params.get("page"), 1, 1, pageCount);

  const start = (page - 1) * pageSize;
  const rows = removed.slice(start, start + pageSize);

  return NextResponse.json({ rows, total, page, pageSize, pageCount });
}
