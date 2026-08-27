/**
 * Bounded, rate-limit-aware processing of the Companies House matching
 * queue. Priority order: removed sponsors first (unblocks the withdrawn/
 * closed split), then background backfill of active sponsors with no
 * SIC/industry data yet. Never guesses: a low-confidence or divergent match
 * leaves the sponsor at `unknown` / routes to sponsor_review_queue instead
 * of asserting a status the data doesn't support.
 */
import { and, asc, desc, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db/client";
import { sponsors, sponsorEvents, sponsorReviewQueue } from "@/db/schema";
import { lookupsUsedInWindow, RATE_LIMIT_MAX_LOOKUPS } from "./cache";
import { matchSponsorToCompaniesHouse, CONFIDENT_THRESHOLD } from "./match";
import { classifyCompanyStatus, CompaniesHouseRateLimitError } from "./client";

const RECHECK_AFTER_DAYS = 30;
const MAX_CONSECUTIVE_ERRORS = 3; // a handful of bad names is normal; this many in a row suggests the API itself is down

export interface ProcessQueueResult {
  processed: number;
  reclassified: number;
  matchedBackfill: number;
  divergentFlagged: number;
  unmatched: number;
  errored: number;
  stoppedForRateLimit: boolean;
  stoppedForErrors: boolean;
  errors: Array<{ sponsorId: string; message: string }>;
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

  // Priority 2: sponsors already matched to a company number before the incorporation-date/
  // registered-office/company-type/matched-on fields existed - reprocess so those columns get
  // backfilled. Cheap: resolveCompanyForName's 30-day cache means this is almost never a real
  // API call, just re-reading the cached lookup and re-writing the row.
  const enrichmentBackfill = await db
    .select()
    .from(sponsors)
    .where(and(isNotNull(sponsors.companiesHouseNumber), isNull(sponsors.companiesHouseIncorporatedAt)))
    .orderBy(asc(sponsors.companiesHouseMatchedAt))
    .limit(limit - priority.length);

  if (priority.length + enrichmentBackfill.length >= limit) return [...priority, ...enrichmentBackfill];

  // Priority 3: background backfill for active sponsors with no CH data yet.
  const backfill = await db
    .select()
    .from(sponsors)
    .where(and(eq(sponsors.status, "active"), isNull(sponsors.companiesHouseMatchedAt)))
    .orderBy(asc(sponsors.firstSeenAt))
    .limit(limit - priority.length - enrichmentBackfill.length);

  return [...priority, ...enrichmentBackfill, ...backfill];
}

export async function processCompaniesHouseQueue(maxToProcess = 50): Promise<ProcessQueueResult> {
  const result: ProcessQueueResult = {
    processed: 0,
    reclassified: 0,
    matchedBackfill: 0,
    divergentFlagged: 0,
    unmatched: 0,
    errored: 0,
    stoppedForRateLimit: false,
    stoppedForErrors: false,
    errors: [],
  };

  const batch = await pickBatch(maxToProcess);
  let consecutiveErrors = 0;

  for (const sponsor of batch) {
    if ((await lookupsUsedInWindow()) >= RATE_LIMIT_MAX_LOOKUPS) {
      result.stoppedForRateLimit = true;
      break;
    }

    let matchResult;
    try {
      const variants = sponsor.nameVariants.length > 0 ? sponsor.nameVariants : [sponsor.displayName];
      matchResult = await matchSponsorToCompaniesHouse(variants);
    } catch (err) {
      // A single sponsor's lookup failing (timeout, 5xx, unexpected 429) must not take down the
      // rest of the batch - record it and move on, but stop early if failures are consecutive,
      // since that means the API itself is down, not that this one name is unusual.
      result.processed++;
      result.errored++;
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ sponsorId: sponsor.id, message });
      console.error(`[companies-house-sync] lookup failed for sponsor ${sponsor.id} ("${sponsor.displayName}"): ${message}`);

      if (err instanceof CompaniesHouseRateLimitError) {
        result.stoppedForRateLimit = true;
        break;
      }
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        result.stoppedForErrors = true;
        break;
      }
      continue;
    }
    consecutiveErrors = 0;
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
      await db
        .update(sponsors)
        .set({
          companiesHouseNeedsReview: true,
          companiesHouseMatchedOn: `${matchResult.allMatches.length} name variant(s) resolved to different companies - see sponsor_review_queue`,
          companiesHouseMatchedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(sponsors.id, sponsor.id));
      result.divergentFlagged++;
      continue;
    }

    // Every attempt records confidence + basis, even a non-match - "why does the system
    // believe (or not believe) this" must be answerable for every processed record, not
    // just the successful ones.
    const attemptedOn =
      matchResult.allMatches.length > 0
        ? `best of ${matchResult.allMatches.length} variant(s): "${matchResult.allMatches.slice().sort((a, b) => b.confidence - a.confidence)[0].variant}" vs "${matchResult.allMatches.slice().sort((a, b) => b.confidence - a.confidence)[0].matchedCompanyName ?? "no CH result"}"`
        : "no name variants to try";

    if (!matchResult.bestMatch || matchResult.confidence < CONFIDENT_THRESHOLD) {
      // No confident match - leave as unknown, but record that we tried so
      // this doesn't get re-picked every single run before RECHECK_AFTER_DAYS.
      await db
        .update(sponsors)
        .set({
          companiesHouseMatchedAt: new Date(),
          companiesHouseMatchConfidence: String(matchResult.confidence),
          companiesHouseMatchedOn: `Below confidence threshold (${(CONFIDENT_THRESHOLD * 100).toFixed(0)}%) - ${attemptedOn}`,
          statusConfidence: String(matchResult.confidence),
          updatedAt: new Date(),
        })
        .where(eq(sponsors.id, sponsor.id));
      result.unmatched++;
      continue;
    }

    const { bestMatch } = matchResult;
    const sicCode = bestMatch.sicCodes?.[0] ?? null;
    const matchedOn = `name variant "${bestMatch.variant}" -> "${bestMatch.matchedCompanyName}" (${bestMatch.fromCache ? "cached" : "fresh"} lookup, ${(matchResult.confidence * 100).toFixed(0)}% name similarity)`;

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
          companiesHouseMatchedOn: matchedOn,
          companiesHouseIncorporatedAt: bestMatch.incorporatedAt,
          companiesHouseRegisteredOffice: bestMatch.registeredOffice,
          companiesHouseCompanyType: bestMatch.companyType,
          companiesHouseNeedsReview: false,
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
      // Background backfill on an active sponsor - industry/SIC + CH profile fields, no status change.
      await db
        .update(sponsors)
        .set({
          companiesHouseNumber: bestMatch.matchedCompanyNumber,
          companiesHouseMatchConfidence: String(matchResult.confidence),
          companiesHouseMatchedAt: new Date(),
          companiesHouseMatchedOn: matchedOn,
          companiesHouseIncorporatedAt: bestMatch.incorporatedAt,
          companiesHouseRegisteredOffice: bestMatch.registeredOffice,
          companiesHouseCompanyType: bestMatch.companyType,
          companiesHouseNeedsReview: false,
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
