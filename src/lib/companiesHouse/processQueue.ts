/**
 * Bounded, rate-limit-aware processing of the Companies House matching
 * queue. Priority order: removed sponsors first (unblocks the withdrawn/
 * closed split), then background backfill of active sponsors with no
 * SIC/industry data yet. Never guesses: a low-confidence or divergent match
 * leaves the sponsor at `unknown` / routes to sponsor_review_queue instead
 * of asserting a status the data doesn't support.
 */
import { and, asc, desc, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db/client";
import { sponsors, sponsorEvents, sponsorReviewQueue } from "@/db/schema";
import { lookupsUsedInWindow, RATE_LIMIT_MAX_LOOKUPS } from "./cache";
import { matchSponsorToCompaniesHouse, CONFIDENT_THRESHOLD } from "./match";
import { classifyCompanyStatus } from "./client";

const RECHECK_AFTER_DAYS = 30;

export interface ProcessQueueResult {
  processed: number;
  reclassified: number;
  matchedBackfill: number;
  divergentFlagged: number;
  unmatched: number;
  stoppedForRateLimit: boolean;
}

async function pickBatch(limit: number) {
  const recheckCutoff = new Date(Date.now() - RECHECK_AFTER_DAYS * 86_400_000);

  // Priority 1: removed sponsors we haven't classified (or haven't rechecked in a while).
  const priority = await db
    .select()
    .from(sponsors)
    .where(
      and(
        eq(sponsors.status, "unknown"),
        or(isNull(sponsors.companiesHouseMatchedAt), lt(sponsors.companiesHouseMatchedAt, recheckCutoff))
      )
    )
    .orderBy(desc(sponsors.lastSeenAt))
    .limit(limit);

  if (priority.length >= limit) return priority;

  // Priority 2: background backfill for active sponsors with no CH data yet.
  const backfill = await db
    .select()
    .from(sponsors)
    .where(and(eq(sponsors.status, "active"), isNull(sponsors.companiesHouseMatchedAt)))
    .orderBy(asc(sponsors.firstSeenAt))
    .limit(limit - priority.length);

  return [...priority, ...backfill];
}

export async function processCompaniesHouseQueue(maxToProcess = 50): Promise<ProcessQueueResult> {
  const result: ProcessQueueResult = {
    processed: 0,
    reclassified: 0,
    matchedBackfill: 0,
    divergentFlagged: 0,
    unmatched: 0,
    stoppedForRateLimit: false,
  };

  const batch = await pickBatch(maxToProcess);

  for (const sponsor of batch) {
    if ((await lookupsUsedInWindow()) >= RATE_LIMIT_MAX_LOOKUPS) {
      result.stoppedForRateLimit = true;
      break;
    }

    const variants = sponsor.nameVariants.length > 0 ? sponsor.nameVariants : [sponsor.displayName];
    const matchResult = await matchSponsorToCompaniesHouse(variants);
    result.processed++;

    if (matchResult.divergent) {
      await db.insert(sponsorReviewQueue).values({
        syncRunId: null,
        candidateType: "unmerge",
        oldSponsorId: sponsor.id,
        newRowRaw: { variants: matchResult.allMatches },
        similarityScore: String(Math.max(...matchResult.allMatches.map((m) => m.confidence))),
        status: "pending",
      });
      result.divergentFlagged++;
      continue;
    }

    if (!matchResult.bestMatch || matchResult.confidence < CONFIDENT_THRESHOLD) {
      // No confident match - leave as unknown, but record that we tried so
      // this doesn't get re-picked every single run before RECHECK_AFTER_DAYS.
      await db
        .update(sponsors)
        .set({ companiesHouseMatchedAt: new Date(), statusConfidence: String(matchResult.confidence), updatedAt: new Date() })
        .where(eq(sponsors.id, sponsor.id));
      result.unmatched++;
      continue;
    }

    const { bestMatch } = matchResult;
    const sicCode = bestMatch.sicCodes?.[0] ?? null;

    if (sponsor.status === "unknown") {
      const newStatus = classifyCompanyStatus(bestMatch.companyStatus ?? "");
      await db
        .update(sponsors)
        .set({
          status: newStatus,
          statusConfidence: String(matchResult.confidence),
          companiesHouseNumber: bestMatch.matchedCompanyNumber,
          companiesHouseMatchConfidence: String(matchResult.confidence),
          companiesHouseMatchedAt: new Date(),
          sicCode,
          industrySource: sicCode ? "companies_house" : sponsor.industrySource,
          updatedAt: new Date(),
        })
        .where(eq(sponsors.id, sponsor.id));

      await db.insert(sponsorEvents).values({
        sponsorId: sponsor.id,
        syncRunId: null,
        eventType: "status_reclassified",
        occurredAt: new Date(),
        before: { status: "unknown" },
        after: { status: newStatus, companiesHouseNumber: bestMatch.matchedCompanyNumber, companyStatus: bestMatch.companyStatus },
        notes: `Matched "${bestMatch.variant}" to ${bestMatch.matchedCompanyName} (${bestMatch.matchedCompanyNumber}) at ${(matchResult.confidence * 100).toFixed(0)}% confidence.`,
      });
      result.reclassified++;
    } else {
      // Background backfill on an active sponsor - industry/SIC only, no status change.
      await db
        .update(sponsors)
        .set({
          companiesHouseNumber: bestMatch.matchedCompanyNumber,
          companiesHouseMatchConfidence: String(matchResult.confidence),
          companiesHouseMatchedAt: new Date(),
          sicCode,
          industrySource: sicCode ? "companies_house" : sponsor.industrySource,
          updatedAt: new Date(),
        })
        .where(eq(sponsors.id, sponsor.id));
      result.matchedBackfill++;
    }
  }

  return result;
}
