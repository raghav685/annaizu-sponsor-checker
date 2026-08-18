import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync/runSync";
import { checkAlerts } from "@/lib/sync/alerts";

// State-mutating GET: never cached, never statically analysed, never indexed.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_INDEX_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "X-Robots-Tag": "noindex, nofollow",
};

// Vercel Cron calls this on schedule (see vercel.json) with an
// `Authorization: Bearer $CRON_SECRET` header it adds automatically. The same
// header authorizes a manual trigger (e.g. `curl -H "Authorization: Bearer
// $CRON_SECRET" -X POST https://.../api/sync/trigger`) - there is no separate
// "manual" endpoint, just an authorized call to this one.
//
// Note on the initial baseline load: the first-ever sync inserts ~127k rows.
// Measured locally (PGlite): a full changed-publish run (fetch 11MB, parse,
// stage ~141k rows, load current state, diff, transactional commit) takes
// ~12.1-12.6s consistently across three runs - comfortably inside this
// route's 60s maxDuration for ongoing daily deltas. The one-time baseline
// load (~127k inserts, no prior state to diff against) took ~97s via the
// CLI in the same environment - run that one with `npm run sync` against
// DATABASE_URL directly, not through this route, until it's confirmed safe
// against production Neon (network RTT per query will be slower than local
// PGlite; see docs/data-pipeline.md).
async function handleTrigger(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on the server." }, { status: 500, headers: NO_INDEX_HEADERS });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_INDEX_HEADERS });
  }

  const outcome = await runSync();
  const alerts = await checkAlerts();

  return NextResponse.json({ outcome, alerts }, { headers: NO_INDEX_HEADERS });
}

// Vercel Cron invokes scheduled jobs with GET; POST is kept for an explicit
// manual trigger (e.g. `curl -X POST`). Both run the identical logic.
export const GET = handleTrigger;
export const POST = handleTrigger;

export const maxDuration = 60;
