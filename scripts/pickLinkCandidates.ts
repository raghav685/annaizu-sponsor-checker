/**
 * Prioritized selector for the next batch of sponsors needing a
 * website/LinkedIn lookup - the same `pickBatch` shape as
 * src/lib/companiesHouse/processQueue.ts, but there's no automated matcher
 * to call yet (no paid enrichment API, no wired-up LLM-with-web-search
 * client): a confident website/LinkedIn match requires real judgement, the
 * same way the initial ~500-sponsor seed was done (see
 * scripts/seedSponsorLinks.ts and DECISIONS.md).
 *
 * Workflow for extending coverage: run this to get the next batch of
 * candidates, research them (manually, or via an agent with web search,
 * exactly like the initial seed), write results as `results-*.json` files
 * shaped `{ id, website, linkedin }[]`, then feed that directory to
 * `seedSponsorLinks.ts`.
 *
 * Usage: npx tsx scripts/pickLinkCandidates.ts [limit] > candidates.json
 */
import { and, asc, desc, eq, isNull, lt, or } from "drizzle-orm";
import { db, describeDbTarget } from "../src/db/client";
import { sponsors, sponsorRoutes } from "../src/db/schema";

const RECHECK_AFTER_DAYS = 90; // links change far less often than CH company status

async function pickLinkCandidates(limit: number) {
  const recheckCutoff = new Date(Date.now() - RECHECK_AFTER_DAYS * 86_400_000);

  const routeCount = db.$count(sponsorRoutes, and(eq(sponsorRoutes.sponsorId, sponsors.id), eq(sponsorRoutes.isCurrent, true)));

  // Priority 1: active sponsors never checked, biggest (by current route
  // count) first - the same size proxy used for the initial seed.
  const neverChecked = await db
    .select({ id: sponsors.id, displayName: sponsors.displayName, town: sponsors.town, routeCount })
    .from(sponsors)
    .where(and(eq(sponsors.status, "active"), isNull(sponsors.linksCheckedAt)))
    .orderBy(desc(routeCount))
    .limit(limit);

  if (neverChecked.length >= limit) return neverChecked;

  // Priority 2: active sponsors whose last check is stale - re-verify links
  // that may have gone dead or been superseded.
  const stale = await db
    .select({ id: sponsors.id, displayName: sponsors.displayName, town: sponsors.town, routeCount })
    .from(sponsors)
    .where(and(eq(sponsors.status, "active"), lt(sponsors.linksCheckedAt, recheckCutoff), or(isNull(sponsors.website), isNull(sponsors.linkedin))))
    .orderBy(asc(sponsors.linksCheckedAt))
    .limit(limit - neverChecked.length);

  return [...neverChecked, ...stale];
}

async function main() {
  const limit = Number(process.argv[2] ?? 500);
  console.error(`[link-candidates] Target: ${describeDbTarget()}`);
  const rows = await pickLinkCandidates(limit);
  console.error(`[link-candidates] ${rows.length} candidates (limit ${limit}).`);
  console.log(JSON.stringify(rows, null, 0));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[link-candidates] Failed:", err);
    process.exit(1);
  });
