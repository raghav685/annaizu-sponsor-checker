/**
 * One-off historical backfill from the Internet Archive's snapshots of the
 * GOV.UK sponsor register publication page. Phase 1 only: fetch every
 * snapshot in the requested window, parse it, and chain computeDiff() calls
 * across them in memory - entirely offline, zero Supabase reads/writes -
 * so the result can be inspected before anything touches the live database.
 * Output: a JSON file with the full accumulated event log and final
 * reconstructed state, written to the path given as argv[3] (or a default).
 *
 * Usage: npx tsx scripts/backfillArchive.ts <fromYYYYMMDD> <toYYYYMMDD> [outFile]
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseRegisterCsv, type StagingSponsor } from "./lib/parseRegister";
import { computeDiff, identityKey, type CurrentSponsorState, type StagedSponsorGroup, type DiffEvent } from "./lib/diff";

const PUBLICATION_PATH = "gov.uk/government/publications/register-of-licensed-sponsors-workers";
const USER_AGENT = "uk-sponsors-explorer-backfill/1.0 (+https://github.com/annaizu)";
const DELAY_MS = 1200; // polite pacing against archive.org

// Disk cache of successfully-fetched archived CSVs, keyed by snapshot timestamp -
// archive.org is intermittently flaky (connection refusals under normal, low-rate
// access), so a script restart should never have to re-fetch what it already got.
const CACHE_DIR = "/tmp/archive-csv-cache";
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SnapshotRow {
  timestamp: string; // YYYYMMDDHHMMSS
}

// archive.org occasionally refuses a connection or times out transiently under
// polite, low-rate access - not a systemic block, just worth a retry rather
// than aborting a multi-minute run over one blip.
async function fetchWithRetry(url: string, retries = 6): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    } catch (err) {
      if (attempt === retries) throw err;
      const backoffMs = 3000 * attempt;
      console.warn(`  [retry ${attempt}/${retries - 1}] ${(err as Error).message} - waiting ${backoffMs}ms`);
      await sleep(backoffMs);
    }
  }
  throw new Error("unreachable");
}

async function fetchCdxList(from: string, to: string): Promise<SnapshotRow[]> {
  const url = `http://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(PUBLICATION_PATH)}&output=json&from=${from}&to=${to}&collapse=timestamp:8`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`CDX API returned ${res.status}`);
  const rows = (await res.json()) as string[][];
  return rows.slice(1).map((r) => ({ timestamp: r[1] }));
}

async function fetchArchivedCsv(timestamp: string): Promise<{ csvText: string; dateLabel: string } | null> {
  const cachePath = path.join(CACHE_DIR, `${timestamp}.json`);
  if (existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf-8"));
  }

  const pageUrl = `http://web.archive.org/web/${timestamp}/https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers`;
  const pageRes = await fetchWithRetry(pageUrl);
  if (!pageRes.ok) {
    console.warn(`  [skip] page fetch ${pageRes.status} for ${timestamp}`);
    return null;
  }
  const html = await pageRes.text();
  const matches = [...html.matchAll(/href="(http:\/\/web\.archive\.org\/web\/\d+[a-z_]*\/https:\/\/assets\.publishing\.service\.gov\.uk\/media\/[^"]+\.csv)"/g)];
  if (matches.length === 0) {
    console.warn(`  [skip] no CSV link found in page for ${timestamp}`);
    return null;
  }
  const csvArchiveUrl = matches[0][1];
  const csvRes = await fetchWithRetry(csvArchiveUrl);
  if (!csvRes.ok) {
    console.warn(`  [skip] CSV fetch ${csvRes.status} for ${timestamp}`);
    return null;
  }
  const csvText = await csvRes.text();
  // Filename embeds the real publish date when present; fall back to the snapshot's own date.
  const dateMatch = csvArchiveUrl.match(/(\d{4}-\d{2}-\d{2})/);
  const dateLabel = dateMatch ? dateMatch[1] : `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;
  const result = { csvText, dateLabel };
  writeFileSync(cachePath, JSON.stringify(result));
  return result;
}

function toStagedGroups(sponsors: StagingSponsor[]): StagedSponsorGroup[] {
  return sponsors.map((s) => ({
    matchKey: s.matchKey,
    displayName: s.displayName,
    town: s.town,
    county: s.county,
    region: s.region,
    sector: s.sector,
    nameVariants: s.nameVariants,
    routes: s.routes,
  }));
}

async function main() {
  const from = process.argv[2];
  const to = process.argv[3];
  const outFile = process.argv[4] ?? "/tmp/archive-backfill-result.json";
  if (!from || !to) {
    console.error("Usage: npx tsx scripts/backfillArchive.ts <fromYYYYMMDD> <toYYYYMMDD> [outFile]");
    process.exit(1);
  }

  console.log(`[backfill] Fetching CDX snapshot list ${from}..${to}...`);
  const snapshots = await fetchCdxList(from, to);
  console.log(`[backfill] ${snapshots.length} snapshots to process.`);

  // In-memory mirror of `sponsors` + current routes, keyed by identityKey(matchKey, town).
  const state = new Map<string, CurrentSponsorState & { firstSeenDate: string; lastSeenDate: string }>();
  const allEvents: Array<DiffEvent & { occurredAt: string }> = [];
  const runsSummary: Array<{ date: string; rowCount: number; added: number; removed: number; updated: number }> = [];

  let processed = 0;
  let skipped = 0;

  for (const snap of snapshots) {
    const result = await fetchArchivedCsv(snap.timestamp);
    if (!result) {
      skipped++;
      await sleep(DELAY_MS);
      continue;
    }
    const { csvText, dateLabel } = result;
    let parsed;
    try {
      parsed = parseRegisterCsv(csvText);
    } catch (err) {
      console.warn(`  [skip] parse failed for ${dateLabel}: ${(err as Error).message}`);
      skipped++;
      await sleep(DELAY_MS);
      continue;
    }
    if (parsed.sponsors.length < 1000) {
      // Sanity guard: a real register CSV has ~100k+ orgs. A tiny parse result
      // means the archive served a redirect/placeholder page, not real data.
      console.warn(`  [skip] suspiciously small parse (${parsed.sponsors.length} sponsors) for ${dateLabel} - likely not real data`);
      skipped++;
      await sleep(DELAY_MS);
      continue;
    }

    const currentArray: CurrentSponsorState[] = Array.from(state.values());
    const stagedGroups = toStagedGroups(parsed.sponsors);
    const diff = computeDiff(currentArray, stagedGroups);

    // Same guard the real sync pipeline uses (runSync.ts HALT_THRESHOLD): a
    // huge chunk of the register disappearing in one publish is far more
    // likely a truncated/corrupted archive download than a real event -
    // reject it outright rather than poisoning every diff after it.
    const HALT_THRESHOLD = 0.02;
    if (currentArray.length > 0 && diff.removalRatio > HALT_THRESHOLD) {
      console.warn(
        `  [skip] ${dateLabel}: removal ratio ${(diff.removalRatio * 100).toFixed(1)}% (${diff.sponsorsRemovedCount} of ${diff.sponsorsActiveBefore}) exceeds ${HALT_THRESHOLD * 100}% - treating as corrupted archive data, not applying`
      );
      skipped++;
      await sleep(DELAY_MS);
      continue;
    }

    // Apply the diff to the in-memory state.
    for (const upsert of diff.sponsorUpserts) {
      const existing = state.get(upsert.identityKey);
      if (upsert.action === "insert") {
        state.set(upsert.identityKey, {
          id: randomUUID(),
          matchKey: upsert.matchKey,
          displayName: upsert.displayName,
          town: upsert.town,
          county: upsert.county,
          region: upsert.region,
          sector: upsert.sector,
          status: "active",
          nameVariants: upsert.nameVariants,
          routes: [],
          firstSeenDate: dateLabel,
          lastSeenDate: dateLabel,
        });
      } else if (upsert.action === "reactivate") {
        if (existing) {
          existing.status = "active";
          existing.displayName = upsert.displayName;
          existing.county = upsert.county;
          existing.region = upsert.region;
          existing.sector = upsert.sector;
          existing.nameVariants = upsert.nameVariants;
          existing.lastSeenDate = dateLabel;
        }
      } else if (upsert.action === "update") {
        if (existing) {
          existing.displayName = upsert.displayName;
          existing.county = upsert.county;
          existing.region = upsert.region;
          existing.sector = upsert.sector;
          existing.nameVariants = upsert.nameVariants;
          existing.lastSeenDate = dateLabel;
        }
      } else if (upsert.action === "remove") {
        if (existing) {
          existing.status = "unknown";
        }
      }
    }
    for (const rc of diff.routeChanges) {
      const s = state.get(rc.identityKey);
      if (!s) continue;
      if (rc.action === "add") {
        s.routes.push({ route: rc.route, rating: rc.rating, sponsorType: rc.sponsorType });
      } else if (rc.action === "update_rating") {
        const r = s.routes.find((x) => x.route === rc.route);
        if (r) r.rating = rc.rating;
      } else if (rc.action === "deactivate") {
        s.routes = s.routes.filter((x) => x.route !== rc.route);
      }
    }
    // Any sponsor still active this round gets its lastSeenDate bumped.
    for (const s of stagedGroups) {
      const key = identityKey(s.matchKey, s.town);
      const entry = state.get(key);
      if (entry) entry.lastSeenDate = dateLabel;
    }

    for (const ev of diff.events) allEvents.push({ ...ev, occurredAt: dateLabel });
    runsSummary.push({ date: dateLabel, rowCount: parsed.rawRowCount, added: diff.sponsorsAddedCount, removed: diff.sponsorsRemovedCount, updated: diff.sponsorsUpdatedCount });

    processed++;
    console.log(`  [${processed}/${snapshots.length}] ${dateLabel}: +${diff.sponsorsAddedCount} -${diff.sponsorsRemovedCount} ~${diff.sponsorsUpdatedCount} (active now: ${Array.from(state.values()).filter((s) => s.status === "active").length})`);

    if (processed % 10 === 0) {
      writeOutput(outFile, processed, skipped, runsSummary, state, allEvents);
      console.log(`  [checkpoint] saved progress to ${outFile}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`[backfill] Done. Processed ${processed}, skipped ${skipped}.`);
  console.log(`[backfill] Total accumulated events: ${allEvents.length}`);
  console.log(`[backfill] Final reconstructed active count: ${Array.from(state.values()).filter((s) => s.status === "active").length}`);

  writeOutput(outFile, processed, skipped, runsSummary, state, allEvents);
  console.log(`[backfill] Written to ${outFile}`);
}

function writeOutput(
  outFile: string,
  processed: number,
  skipped: number,
  runsSummary: Array<{ date: string; rowCount: number; added: number; removed: number; updated: number }>,
  state: Map<string, CurrentSponsorState & { firstSeenDate: string; lastSeenDate: string }>,
  allEvents: Array<DiffEvent & { occurredAt: string }>
) {
  const output = {
    processedSnapshots: processed,
    skippedSnapshots: skipped,
    runsSummary,
    finalState: Array.from(state.entries()).map(([key, s]) => ({ identityKey: key, ...s })),
    events: allEvents,
  };
  writeFileSync(outFile, JSON.stringify(output));
}

main().catch((err) => {
  console.error("[backfill] FAILED:", err);
  process.exit(1);
});
