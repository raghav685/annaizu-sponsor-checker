import { similarity, buildMatchKey } from "../../../scripts/lib/matchKey";
import type { CachedLookup } from "./cache";

export interface VariantMatch extends CachedLookup {
  variant: string;
  confidence: number; // 0-1, name-similarity based
}

export interface SponsorMatchResult {
  bestMatch: VariantMatch | null;
  confidence: number;
  divergent: boolean; // true if variants confidently resolve to different companies
  allMatches: VariantMatch[];
}

const CONFIDENT_THRESHOLD = 0.82; // below this, we say "unknown" rather than guess

// Normalises both names (strip LTD/LIMITED/PLC/&-vs-AND/punctuation - see buildMatchKey)
// before scoring, same as sponsor identity matching already does within a sync run. Without
// this, a completely unambiguous match like "Smith & Sons Builders" vs Companies House's own
// "SMITH AND SONS BUILDERS LIMITED" scores below CONFIDENT_THRESHOLD purely on the cosmetic
// legal-suffix/punctuation difference and gets left as an avoidable "unmatched" - a real
// completeness gap, not a safety one (the system already errs toward not-matching over
// guessing wrong), but one worth closing since normalising can only raise a genuine match's
// score, never manufacture a false one between two actually-different organisations.
function scoreMatch(queryName: string, lookup: CachedLookup): number {
  if (!lookup.matchedCompanyName) return 0;
  return similarity(buildMatchKey(queryName), buildMatchKey(lookup.matchedCompanyName));
}

/**
 * Tries every raw name variant on record for a sponsor (not just the
 * canonical display name) - per the brief, if variants resolve to different
 * confident company numbers, that's a signal the merge itself may be wrong,
 * not just a matching ambiguity.
 *
 * `resolver` defaults to the real DB-backed cache lookup, loaded lazily via
 * dynamic import rather than a top-level import: this file (and its test
 * suite) must not eagerly pull in src/db/client.ts, which opens a real
 * PGlite connection as a side effect of being imported and hangs the test
 * process (a single embedded connection that never closes keeps Node's
 * event loop alive). Every test here passes its own resolver, so the real
 * one is never touched.
 */
export async function matchSponsorToCompaniesHouse(
  nameVariants: string[],
  resolver?: (name: string) => Promise<CachedLookup>
): Promise<SponsorMatchResult> {
  const resolve = resolver ?? (await import("./cache")).resolveCompanyForName;

  const allMatches: VariantMatch[] = [];
  for (const variant of nameVariants) {
    const lookup = await resolve(variant);
    allMatches.push({ ...lookup, variant, confidence: scoreMatch(variant, lookup) });
  }

  const confident = allMatches.filter((m) => m.confidence >= CONFIDENT_THRESHOLD && m.matchedCompanyNumber);
  const distinctCompanyNumbers = new Set(confident.map((m) => m.matchedCompanyNumber));

  if (distinctCompanyNumbers.size > 1) {
    // Never guess between them - flag for human review instead.
    return { bestMatch: null, confidence: 0, divergent: true, allMatches };
  }

  const best = confident.sort((a, b) => b.confidence - a.confidence)[0] ?? null;
  return { bestMatch: best, confidence: best?.confidence ?? 0, divergent: false, allMatches };
}

export { CONFIDENT_THRESHOLD };
