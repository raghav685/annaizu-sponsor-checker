import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { syncRuns, sponsorReviewQueue } from "@/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Threshold for the external dead-man's-switch: cron alerting (alerts.ts)
// only runs AFTER a sync executes, so it cannot detect cron itself going
// silent (bad secret, quota, a deploy that drops vercel.json). This endpoint
// is designed to be polled by something off-platform instead - point any
// uptime monitor (UptimeRobot, Healthchecks.io, Better Uptime all have free
// tiers) at GET /api/health every 30-60 min, alert on non-200. No JSON-path
// assertions needed: unhealthy always means HTTP 503.
const STALE_ATTEMPT_HOURS = 36;

export async function GET() {
  const lastSuccessful = await db.query.syncRuns.findFirst({
    where: (t, { inArray }) => inArray(t.status, ["success", "no_change"]),
    orderBy: [desc(syncRuns.startedAt)],
  });

  const lastRunOfAny = await db.query.syncRuns.findFirst({
    orderBy: [desc(syncRuns.startedAt)],
  });

  const pendingReviewCount = await db
    .select()
    .from(sponsorReviewQueue)
    .where(eq(sponsorReviewQueue.status, "pending"))
    .then((rows) => rows.length);

  const now = Date.now();
  const daysSinceRegisterChanged = lastSuccessful?.registerPublicUpdatedAt
    ? (now - new Date(lastSuccessful.registerPublicUpdatedAt).getTime()) / 86_400_000
    : null;

  // Time since ANY sync_runs row was created, of any status - this is what
  // detects "cron stopped firing entirely", which is a different failure
  // mode than "the register hasn't changed" (daysSinceRegisterChanged can
  // look perfectly normal while cron is dead, because it just freezes at
  // whatever the last real value was).
  const hoursSinceLastAttempt = lastRunOfAny ? (now - new Date(lastRunOfAny.startedAt).getTime()) / 3_600_000 : null;

  const cronLooksAlive = hoursSinceLastAttempt !== null && hoursSinceLastAttempt < STALE_ATTEMPT_HOURS;
  const lastRunOk = lastRunOfAny?.status !== "failed" && lastRunOfAny?.status !== "halted_for_review";
  const healthy = cronLooksAlive && lastRunOk;

  return NextResponse.json(
    {
      healthy,
      unhealthyReason: !cronLooksAlive ? "no_sync_attempt_in_36h" : !lastRunOk ? "last_run_not_ok" : null,
      lastRun: lastRunOfAny
        ? {
            id: lastRunOfAny.id,
            status: lastRunOfAny.status,
            startedAt: lastRunOfAny.startedAt,
            finishedAt: lastRunOfAny.finishedAt,
            errorMessage: lastRunOfAny.errorMessage,
          }
        : null,
      lastSuccessfulSync: lastSuccessful
        ? {
            id: lastSuccessful.id,
            status: lastSuccessful.status,
            registerPublicUpdatedAt: lastSuccessful.registerPublicUpdatedAt,
            rowCount: lastSuccessful.rowCount,
          }
        : null,
      daysSinceRegisterChanged,
      hoursSinceLastAttempt,
      pendingReviewCount,
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
  );
}
