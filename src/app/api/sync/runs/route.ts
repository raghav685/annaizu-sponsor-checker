import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { syncRuns } from "@/db/schema";

export const dynamic = "force-dynamic";

const NO_INDEX_HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

// Same auth pattern as /api/sync/trigger and /api/companies-house/process - this returns
// internal pipeline history (including errorMessage, which carries a stack trace on a failed
// run per runSync.ts's catch block), so it must not be reachable without the same bearer
// token every other internal/mutating route already requires. Was unauthenticated and
// confirmed publicly reachable before this fix.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on the server." }, { status: 500, headers: NO_INDEX_HEADERS });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_INDEX_HEADERS });
  }

  const runs = await db.query.syncRuns.findMany({
    orderBy: [desc(syncRuns.startedAt)],
    limit: 50,
  });
  return NextResponse.json({ runs }, { headers: NO_INDEX_HEADERS });
}
