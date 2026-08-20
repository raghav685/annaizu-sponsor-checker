/**
 * Phase 2 of the historical backfill: takes the offline-computed result from
 * scripts/backfillArchive.ts (a JSON file with a reconstructed state as of
 * the last good archive snapshot, plus the full accumulated event log),
 * bridges the gap to today's real live data with one more computeDiff call,
 * reconciles every identity against what's ALREADY live in `sponsors` (by
 * match_key+town), and writes the result to the database.
 *
 * Reconciliation rule: an identity that matches a currently-active live
 * sponsor keeps that sponsor's real UUID (never a second row) - only
 * identities that are NOT in today's live active set get a fresh INSERT
 * (status "unknown", matching the real sync's own convention for a removed-
 * but-not-yet-classified sponsor).
 *
 * Defaults to a dry run (prints planned counts, writes nothing). Pass
 * --commit to actually write.
 *
 * Usage: npx tsx scripts/writeBackfillToDb.ts <backfillJsonPath> [--commit]
 */
import { readFileSync } from "node:fs";
import { db, describeDbTarget } from "@/db/client";
import { sponsors, sponsorEvents, syncRuns } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { resolveCurrentSource, fetchCsv } from "./lib/contentApi";
import { parseRegisterCsv } from "./lib/parseRegister";
import { computeDiff, identityKey, type CurrentSponsorState, type StagedSponsorGroup, type DiffEvent } from "./lib/diff";

// The archive's last usable snapshot and today's live data are each independently
// verified real data - the only question is how much genuinely changed across the
// gap between them. HALT_THRESHOLD is calibrated for day-to-day sync diffs; this
// bridge can span months, so it needs a proportionally larger allowance, not the
// same fixed 2%.
const BRIDGE_HALT_THRESHOLD = 0.08;
const BATCH_SIZE = 500;
const CONTENT_API_URL = "https://www.gov.uk/api/content/government/publications/register-of-licensed-sponsors-workers";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface BackfillFinalStateEntry {
  identityKey: string;
  id: string;
  matchKey: string;
  displayName: string;
  town: string;
  county: string;
  region: string;
  sector: string;
  status: "active" | "withdrawn" | "closed" | "unknown";
  nameVariants: string[];
  routes: Array<{ route: string; rating: "A" | "B" | null; sponsorType: "Worker" | "Temporary Worker" }>;
  firstSeenDate: string;
  lastSeenDate: string;
}

interface BackfillOutput {
  processedSnapshots: number;
  skippedSnapshots: number;
  runsSummary: Array<{ date: string; rowCount: number; added: number; removed: number; updated: number }>;
  finalState: BackfillFinalStateEntry[];
  events: Array<DiffEvent & { occurredAt: string }>;
}

async function main() {
  const jsonPath = process.argv[2];
  const commit = process.argv.includes("--commit");
  if (!jsonPath) {
    console.error("Usage: npx tsx scripts/writeBackfillToDb.ts <backfillJsonPath> [--commit]");
    process.exit(1);
  }

  console.log(`[write] Target: ${describeDbTarget()}`);
  console.log(`[write] Mode: ${commit ? "COMMIT (will write to DB)" : "DRY RUN (no writes)"}`);
  console.log(`[write] Loading ${jsonPath}...`);
  const backfill = JSON.parse(readFileSync(jsonPath, "utf-8")) as BackfillOutput;
  console.log(`[write] Loaded: ${backfill.finalState.length} identities, ${backfill.events.length} historical events, last date processed: ${backfill.runsSummary[backfill.runsSummary.length - 1]?.date}`);

  // --- Bridge the gap to today's real live data ---
  console.log("[write] Fetching today's real register from GOV.UK for the bridge diff...");
  const source = await resolveCurrentSource();
  const csvBuffer = await fetchCsv(source.csvUrl);
  const todayParsed = parseRegisterCsv(csvBuffer.toString("utf-8"));
  const todayStaged: StagedSponsorGroup[] = todayParsed.sponsors.map((s) => ({
    matchKey: s.matchKey,
    displayName: s.displayName,
    town: s.town,
    county: s.county,
    region: s.region,
    sector: s.sector,
    nameVariants: s.nameVariants,
    routes: s.routes,
  }));
  const bridgeDateLabel = source.registerPublicUpdatedAt.slice(0, 10);
  console.log(`[write] Today's real register date: ${bridgeDateLabel}, ${todayStaged.length} sponsors.`);

  const stateMap = new Map<string, BackfillFinalStateEntry>();
  for (const entry of backfill.finalState) stateMap.set(entry.identityKey, entry);

  const currentArrayForBridge: CurrentSponsorState[] = Array.from(stateMap.values()).map((s) => ({
    id: s.id,
    matchKey: s.matchKey,
    displayName: s.displayName,
    town: s.town,
    county: s.county,
    region: s.region,
    sector: s.sector,
    status: s.status,
    nameVariants: s.nameVariants,
    routes: s.routes,
  }));
  const bridgeDiff = computeDiff(currentArrayForBridge, todayStaged);
  console.log(
    `[write] Bridge diff (${backfill.runsSummary[backfill.runsSummary.length - 1]?.date} -> ${bridgeDateLabel}): +${bridgeDiff.sponsorsAddedCount} -${bridgeDiff.sponsorsRemovedCount} ~${bridgeDiff.sponsorsUpdatedCount} (removal ratio ${(bridgeDiff.removalRatio * 100).toFixed(2)}%)`
  );
  if (currentArrayForBridge.length > 0 && bridgeDiff.removalRatio > BRIDGE_HALT_THRESHOLD) {
    console.error(
      `[write] ABORTING: bridge diff removal ratio ${(bridgeDiff.removalRatio * 100).toFixed(1)}% exceeds ${BRIDGE_HALT_THRESHOLD * 100}% - this is unexpected even accounting for the longer time gap and needs manual review before proceeding.`
    );
    process.exit(1);
  }

  // Apply the bridge diff to the state map, exactly like backfillArchive.ts did for each historical step.
  const allEvents: Array<DiffEvent & { occurredAt: string }> = [...backfill.events];
  for (const upsert of bridgeDiff.sponsorUpserts) {
    const existing = stateMap.get(upsert.identityKey);
    if (upsert.action === "insert") {
      stateMap.set(upsert.identityKey, {
        identityKey: upsert.identityKey,
        id: crypto.randomUUID(),
        matchKey: upsert.matchKey,
        displayName: upsert.displayName,
        town: upsert.town,
        county: upsert.county,
        region: upsert.region,
        sector: upsert.sector,
        status: "active",
        nameVariants: upsert.nameVariants,
        routes: [],
        firstSeenDate: bridgeDateLabel,
        lastSeenDate: bridgeDateLabel,
      });
    } else if (upsert.action === "reactivate" || upsert.action === "update") {
      if (existing) {
        existing.status = "active";
        existing.displayName = upsert.displayName;
        existing.county = upsert.county;
        existing.region = upsert.region;
        existing.sector = upsert.sector;
        existing.nameVariants = upsert.nameVariants;
        existing.lastSeenDate = bridgeDateLabel;
      }
    } else if (upsert.action === "remove") {
      if (existing) existing.status = "unknown";
    }
  }
  for (const rc of bridgeDiff.routeChanges) {
    const s = stateMap.get(rc.identityKey);
    if (!s) continue;
    if (rc.action === "add") s.routes.push({ route: rc.route, rating: rc.rating, sponsorType: rc.sponsorType });
    else if (rc.action === "update_rating") {
      const r = s.routes.find((x) => x.route === rc.route);
      if (r) r.rating = rc.rating;
    } else if (rc.action === "deactivate") s.routes = s.routes.filter((x) => x.route !== rc.route);
  }
  for (const s of todayStaged) {
    const entry = stateMap.get(identityKey(s.matchKey, s.town));
    if (entry) entry.lastSeenDate = bridgeDateLabel;
  }
  for (const ev of bridgeDiff.events) allEvents.push({ ...ev, occurredAt: bridgeDateLabel });

  console.log(`[write] After bridge: ${stateMap.size} total identities, ${allEvents.length} total events, ${Array.from(stateMap.values()).filter((s) => s.status === "active").length} active.`);

  // --- Reconcile against the live `sponsors` table ---
  console.log("[write] Fetching live sponsors table for reconciliation...");
  const liveRows = await db.select({ id: sponsors.id, matchKey: sponsors.matchKey, town: sponsors.town, firstSeenAt: sponsors.firstSeenAt }).from(sponsors);
  const liveMap = new Map<string, { id: string; firstSeenAt: Date }>();
  for (const r of liveRows) liveMap.set(identityKey(r.matchKey, r.town), { id: r.id, firstSeenAt: r.firstSeenAt });
  console.log(`[write] Live sponsors table has ${liveRows.length} rows.`);

  const idResolution = new Map<string, string>(); // offline identityKey -> real DB uuid to use
  const newSponsorInserts: Array<typeof sponsors.$inferInsert> = [];
  const firstSeenCorrections: Array<{ id: string; correctDate: Date }> = [];
  let mismatchWarnings = 0;

  for (const entry of stateMap.values()) {
    const live = liveMap.get(entry.identityKey);
    if (live) {
      idResolution.set(entry.identityKey, live.id);
      const offlineFirstSeen = new Date(`${entry.firstSeenDate}T00:00:00Z`);
      if (offlineFirstSeen < live.firstSeenAt) {
        firstSeenCorrections.push({ id: live.id, correctDate: offlineFirstSeen });
      }
      if (entry.status !== "active") {
        mismatchWarnings++;
        console.warn(`  [warn] identity ${entry.identityKey} is live-active but offline-reconstructed status is "${entry.status}" - keeping live state, not overwriting.`);
      }
    } else {
      idResolution.set(entry.identityKey, entry.id);
      if (entry.status === "active") {
        mismatchWarnings++;
        console.warn(`  [warn] identity ${entry.identityKey} reconstructed as "active" but not found in live sponsors table - inserting as unknown instead, since live data is ground truth.`);
      }
      newSponsorInserts.push({
        id: entry.id,
        slug: "", // placeholder - real slug assignment happens below before insert
        matchKey: entry.matchKey,
        displayName: entry.displayName,
        nameVariants: entry.nameVariants,
        town: entry.town,
        county: entry.county,
        region: entry.region,
        sector: entry.sector,
        status: entry.status === "active" ? "unknown" : entry.status,
        firstSeenAt: new Date(`${entry.firstSeenDate}T00:00:00Z`),
        lastSeenAt: new Date(`${entry.lastSeenDate}T00:00:00Z`),
      });
    }
  }

  console.log(`[write] Reconciliation: ${idResolution.size - newSponsorInserts.length} matched to live rows, ${newSponsorInserts.length} need fresh inserts, ${mismatchWarnings} mismatch warnings, ${firstSeenCorrections.length} first_seen_at corrections.`);

  // Assign slugs for new inserts - matching the live slugify convention (see runSync.ts), with a
  // numeric suffix on collision (including collisions against already-live slugs).
  const { slugify } = await import("./lib/text");
  const existingSlugs = new Set<string>((await db.select({ slug: sponsors.slug }).from(sponsors)).map((r) => r.slug));
  for (const row of newSponsorInserts) {
    const base = slugify(`${row.displayName}-${row.town}`) || "sponsor";
    let candidate = base;
    let n = 2;
    while (existingSlugs.has(candidate)) {
      candidate = `${base}-${n}`;
      n++;
    }
    existingSlugs.add(candidate);
    row.slug = candidate;
  }

  const eventInserts: Array<typeof sponsorEvents.$inferInsert> = allEvents.map((ev) => {
    const sponsorId = idResolution.get(ev.identityKey);
    return {
      sponsorId: sponsorId!,
      syncRunId: null,
      eventType: ev.eventType,
      occurredAt: new Date(`${ev.occurredAt}T00:00:00Z`),
      route: ev.route ?? null,
      before: ev.before ?? null,
      after: ev.after ?? null,
      notes: ev.notes ?? "Backfilled from Internet Archive snapshot of the GOV.UK publication page.",
    };
  });
  const unresolvedEvents = eventInserts.filter((e) => !e.sponsorId).length;
  if (unresolvedEvents > 0) {
    console.error(`[write] ABORTING: ${unresolvedEvents} events have no resolvable sponsor_id - this indicates a bug in identity reconciliation.`);
    process.exit(1);
  }

  const runInserts: Array<typeof syncRuns.$inferInsert> = [
    ...backfill.runsSummary.map((r) => ({
      status: "success" as const,
      startedAt: new Date(`${r.date}T00:00:00Z`),
      finishedAt: new Date(`${r.date}T00:00:00Z`),
      sourceContentApiUrl: CONTENT_API_URL,
      rowCount: r.rowCount,
      sponsorsAddedCount: r.added,
      sponsorsRemovedCount: r.removed,
      sponsorsUpdatedCount: r.updated,
      errorMessage: null,
    })),
    {
      status: "success" as const,
      startedAt: new Date(`${bridgeDateLabel}T00:00:00Z`),
      finishedAt: new Date(`${bridgeDateLabel}T00:00:00Z`),
      sourceContentApiUrl: CONTENT_API_URL,
      rowCount: todayParsed.rawRowCount,
      sponsorsAddedCount: bridgeDiff.sponsorsAddedCount,
      sponsorsRemovedCount: bridgeDiff.sponsorsRemovedCount,
      sponsorsUpdatedCount: bridgeDiff.sponsorsUpdatedCount,
      errorMessage: null,
    },
  ];

  console.log(`[write] Plan: ${newSponsorInserts.length} new sponsor rows, ${eventInserts.length} event rows, ${runInserts.length} sync_run rows, ${firstSeenCorrections.length} first_seen_at corrections.`);

  if (!commit) {
    console.log("[write] Dry run complete - no writes made. Re-run with --commit to apply.");
    return;
  }

  console.log("[write] Committing...");
  for (const batch of chunk(newSponsorInserts, BATCH_SIZE)) {
    await db.insert(sponsors).values(batch);
  }
  console.log(`[write] Inserted ${newSponsorInserts.length} new sponsor rows.`);

  for (const batch of chunk(eventInserts, BATCH_SIZE)) {
    await db.insert(sponsorEvents).values(batch);
  }
  console.log(`[write] Inserted ${eventInserts.length} event rows.`);

  for (const batch of chunk(runInserts, BATCH_SIZE)) {
    await db.insert(syncRuns).values(batch);
  }
  console.log(`[write] Inserted ${runInserts.length} sync_run rows.`);

  // Group first_seen_at corrections by exact date so each distinct date is one UPDATE
  // over a batched id list, instead of one UPDATE per sponsor.
  const byDate = new Map<string, string[]>();
  for (const c of firstSeenCorrections) {
    const key = c.correctDate.toISOString();
    const list = byDate.get(key) ?? [];
    list.push(c.id);
    byDate.set(key, list);
  }
  let correctionCount = 0;
  for (const [dateIso, ids] of byDate) {
    for (const batch of chunk(ids, BATCH_SIZE)) {
      await db.update(sponsors).set({ firstSeenAt: new Date(dateIso) }).where(inArray(sponsors.id, batch));
      correctionCount += batch.length;
    }
  }
  console.log(`[write] Corrected first_seen_at on ${correctionCount} sponsors.`);

  console.log("[write] Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[write] FAILED:", err);
    process.exit(1);
  });
