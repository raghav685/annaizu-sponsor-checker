/**
 * Core sync orchestration, importable from both the CLI (scripts/sync.ts) and
 * the scheduled/manual trigger API route - one code path, no drift between
 * "what cron runs" and "what you run by hand".
 */
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { eq, desc, sql, inArray, notInArray } from "drizzle-orm";
import { db, describeDbTarget, getRawPostgresClient } from "@/db/client";
import { syncRuns, snapshots, stagedRows, sponsors, sponsorRoutes, sponsorEvents } from "@/db/schema";
import { resolveCurrentSource, fetchCsv } from "../../../scripts/lib/contentApi";
import { parseRegisterCsv } from "../../../scripts/lib/parseRegister";
import { computeDiff, identityKey, type CurrentSponsorState, type StagedSponsorGroup } from "../../../scripts/lib/diff";
import { slugify } from "../../../scripts/lib/text";
import { putSnapshot } from "../snapshotStorage";

const HALT_THRESHOLD = 0.02; // >2% of active sponsors removed in one publish halts for review
// Round-trip count matters more than row count once the DB isn't in the same region as the
// function: confirmed live on production (2026-08-25, run id 90) - Aiven is in Amsterdam, this
// route runs in iad1 (US East), and at BATCH_SIZE=500 the staging insert alone needed ~282
// round-trips. It got killed by the 60s maxDuration at 108,500/~141k staged rows (0
// sponsor_events written - the live sponsors table was never touched, so no data corruption,
// just a killed run). Raised to 3000 to cut round-trips proportionally; still comfortably under
// Postgres's ~65,535-parameter-per-query limit for every table this batches (the widest is
// sponsors at 11 columns: 3000 x 11 = 33,000). Note this constant no longer governs the staging
// insert itself (see copyStagingRows below) - only the smaller insert/update loops further down,
// whose true size on a normal day (a few hundred diffed rows) was never actually the bottleneck.
const BATCH_SIZE = 3000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// drizzle-orm's `sql` template spreads a raw JS array value into multiple comma-separated bind
// placeholders (`($1, $2)::text[]` instead of one array-typed `$1::text[]`) - it's built for
// `IN (${array})`, not for passing an actual array parameter. Confirmed live (2026-08-25, run id
// 96): with a single-element array this degrades to one scalar param cast straight to `text[]`,
// which Postgres rejects. Passing a properly-escaped Postgres array-literal *string* instead
// sidesteps drizzle's array-specific handling entirely - it's just an ordinary text parameter
// that happens to parse as an array once cast.
function toPgTextArrayLiteral(values: string[]): string {
  const escaped = values.map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  return `{${escaped.join(",")}}`;
}

// COPY, not batched parameterized INSERTs, for staging: raising BATCH_SIZE (500 -> 3000 -> 5000)
// and then parallelizing across the connection pool (run id 94, 2026-08-25) both failed to fix
// this, the second attempt making it *worse* (didn't even finish staging in 55s, versus 52s
// single-connection sequential) - strong evidence the bottleneck is data volume/protocol
// overhead against a slow transatlantic link, not round-trip count, so more connections just
// added contention instead of parallelism. COPY streams the whole payload as one continuous
// operation on a single connection - no per-batch bind/execute overhead at all - which is the
// standard fix for bulk-loading over a high-latency/low-bandwidth link.
function copyEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "\\N";
  return String(value).replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

async function copyStagingRows(rows: (typeof stagedRows.$inferInsert)[]): Promise<void> {
  const pg = getRawPostgresClient();
  const writable = await pg`
    copy staged_rows
      (sync_run_id, match_key, display_name, town, county, region, sector, route, rating, sponsor_type)
    from stdin
  `.writable();

  async function* chunksOf(source: typeof rows) {
    const CHUNK_ROWS = 5000;
    let buf = "";
    for (let i = 0; i < source.length; i++) {
      const r = source[i];
      buf +=
        [r.syncRunId, r.matchKey, r.displayName, r.town, r.county, r.region, r.sector, r.route, r.rating, r.sponsorType]
          .map(copyEscape)
          .join("\t") + "\n";
      if ((i + 1) % CHUNK_ROWS === 0) {
        yield buf;
        buf = "";
      }
    }
    if (buf) yield buf;
  }

  await pipeline(Readable.from(chunksOf(rows)), writable);
}

export type SyncOutcome =
  | { status: "no_change"; runId: number }
  | {
      status: "success";
      runId: number;
      rowCount: number;
      sponsorsActiveBefore: number;
      sponsorsAddedCount: number;
      sponsorsRemovedCount: number;
      sponsorsUpdatedCount: number;
    }
  | { status: "halted_for_review"; runId: number; removalRatio: number; sponsorsRemovedCount: number }
  | { status: "failed"; runId: number | null; error: string };

export async function runSync(): Promise<SyncOutcome> {
  // Printed unconditionally, first line of every run, so the target is
  // stated in the output rather than inferred or assumed.
  console.log(`[sync] Target: ${describeDbTarget()}`);

  const source = await resolveCurrentSource();
  const csvBuffer = await fetchCsv(source.csvUrl);
  const fileSha256 = createHash("sha256").update(csvBuffer).digest("hex");

  const lastRun = await db.query.syncRuns.findFirst({
    where: (t, { inArray }) => inArray(t.status, ["success", "no_change"]),
    orderBy: [desc(syncRuns.startedAt)],
  });

  if (lastRun?.fileSha256 === fileSha256) {
    const [row] = await db
      .insert(syncRuns)
      .values({
        sourceContentApiUrl: source.contentApiUrl,
        csvUrl: source.csvUrl,
        csvFilename: source.csvFilename,
        fileSha256,
        registerPublicUpdatedAt: new Date(source.registerPublicUpdatedAt),
        status: "no_change",
        finishedAt: new Date(),
      })
      .returning();
    return { status: "no_change", runId: row.id };
  }

  // A hard Vercel function timeout (this route's maxDuration is 60s) kills the process
  // mid-flight - no catch/finally runs, so a killed run's syncRuns row is stuck at
  // status='running' forever. sync_runs_one_running_uidx then permanently blocks every
  // future sync (including tomorrow's cron) with "Could not start a new sync run" until
  // someone fixes it by hand - confirmed as a real, repeat failure mode (it happened once
  // before in this repo's history, and again live during this session, from a timeout most
  // likely caused by concurrent crawler traffic contending for Aiven's connection limit
  // alongside this route's queries). This route can never legitimately still be running
  // more than a few minutes after it started, so any row past that age is unambiguously
  // abandoned, not a genuine concurrent run - auto-resolve it instead of requiring a human
  // to notice and run a manual UPDATE.
  const STALE_RUNNING_MINUTES = 5;
  const staleRunning = await db.query.syncRuns.findFirst({ where: eq(syncRuns.status, "running") });
  if (staleRunning && Date.now() - new Date(staleRunning.startedAt).getTime() > STALE_RUNNING_MINUTES * 60_000) {
    await db
      .update(syncRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        errorMessage: `Auto-resolved: row was stuck at status='running' for over ${STALE_RUNNING_MINUTES} minutes - almost certainly killed by this route's 60s function timeout mid-run, not a genuine still-active sync.`,
      })
      .where(eq(syncRuns.id, staleRunning.id));
    console.warn(`[sync] Auto-resolved stale "running" run ${staleRunning.id} (started ${new Date(staleRunning.startedAt).toISOString()}) before starting a new one.`);
  }

  // staged_rows is a working table (parsed CSV rows land here before the diff/commit phase,
  // see the table's own schema comment) that nothing has ever cleaned up - confirmed live:
  // it had accumulated ~1.9M rows / 465MB across this project's history and put the whole
  // database into Aiven's forced read-only mode (disk quota exhausted), taking down every
  // write path (this sync, the Companies House queue, everything) until a human noticed the
  // alert and ran a manual DELETE. A halted_for_review run's staged rows are the one
  // legitimate reason to keep them (a human needs to inspect exactly what was staged), so
  // this only ever removes rows belonging to a run that's fully done and not under review -
  // safe to run on every invocation, not just as a one-off cleanup.
  await db.delete(stagedRows).where(
    inArray(
      stagedRows.syncRunId,
      db.select({ id: syncRuns.id }).from(syncRuns).where(notInArray(syncRuns.status, ["running", "halted_for_review"]))
    )
  );

  let run: typeof syncRuns.$inferSelect;
  try {
    const [inserted] = await db
      .insert(syncRuns)
      .values({
        sourceContentApiUrl: source.contentApiUrl,
        csvUrl: source.csvUrl,
        csvFilename: source.csvFilename,
        fileSha256,
        registerPublicUpdatedAt: new Date(source.registerPublicUpdatedAt),
        status: "running",
      })
      .returning();
    run = inserted;
  } catch (err) {
    return { status: "failed", runId: null, error: `Could not start a new sync run (likely one is already running): ${err}` };
  }

  try {
    const parsed = parseRegisterCsv(csvBuffer.toString("utf-8"));

    const stagingRows = parsed.sponsors.flatMap((s) =>
      s.routes.map((r) => ({
        syncRunId: run.id,
        matchKey: s.matchKey,
        displayName: s.displayName,
        town: s.town,
        county: s.county,
        region: s.region,
        sector: s.sector,
        route: r.route,
        rating: r.rating,
        sponsorType: r.sponsorType,
      }))
    );
    await copyStagingRows(stagingRows);

    const stagedGroups: StagedSponsorGroup[] = parsed.sponsors.map((s) => ({
      matchKey: s.matchKey,
      displayName: s.displayName,
      town: s.town,
      county: s.county,
      region: s.region,
      sector: s.sector,
      nameVariants: s.nameVariants,
      routes: s.routes.map((r) => ({ route: r.route, rating: r.rating, sponsorType: r.sponsorType })),
    }));

    const currentSponsors = await db.select().from(sponsors);
    const currentRoutes = await db.select().from(sponsorRoutes).where(eq(sponsorRoutes.isCurrent, true));
    const routesBySponsorId = new Map<string, { route: string; rating: "A" | "B" | null; sponsorType: "Worker" | "Temporary Worker" }[]>();
    for (const r of currentRoutes) {
      const list = routesBySponsorId.get(r.sponsorId) ?? [];
      list.push({ route: r.route, rating: r.rating as "A" | "B" | null, sponsorType: r.sponsorType as "Worker" | "Temporary Worker" });
      routesBySponsorId.set(r.sponsorId, list);
    }
    const currentState: CurrentSponsorState[] = currentSponsors.map((s) => ({
      id: s.id,
      matchKey: s.matchKey,
      displayName: s.displayName,
      town: s.town,
      county: s.county,
      region: s.region,
      sector: s.sector,
      status: s.status,
      nameVariants: s.nameVariants,
      routes: routesBySponsorId.get(s.id) ?? [],
    }));
    const idByIdentityKey = new Map(currentSponsors.map((s) => [identityKey(s.matchKey, s.town), s.id]));
    const usedSlugs = new Set(currentSponsors.map((s) => s.slug));

    function assignSlug(displayName: string, town: string): string {
      const base = slugify(`${displayName}-${town}`) || "sponsor";
      if (!usedSlugs.has(base)) {
        usedSlugs.add(base);
        return base;
      }
      let n = 2;
      while (usedSlugs.has(`${base}-${n}`)) n++;
      const withSuffix = `${base}-${n}`;
      usedSlugs.add(withSuffix);
      return withSuffix;
    }

    const diff = computeDiff(currentState, stagedGroups);
    console.log(
      `[sync] computed diff: ${diff.sponsorUpserts.length} sponsor upserts, ${diff.routeChanges.length} route changes, ${diff.events.length} events`
    );

    if (diff.sponsorsActiveBefore > 0 && diff.removalRatio > HALT_THRESHOLD) {
      await db
        .update(syncRuns)
        .set({
          status: "halted_for_review",
          finishedAt: new Date(),
          rowCount: parsed.rawRowCount,
          sponsorsActiveBefore: diff.sponsorsActiveBefore,
          sponsorsRemovedCount: diff.sponsorsRemovedCount,
          sponsorsAddedCount: diff.sponsorsAddedCount,
          sponsorsUpdatedCount: diff.sponsorsUpdatedCount,
          haltSummary: {
            removalRatio: diff.removalRatio,
            threshold: HALT_THRESHOLD,
            removedIdentities: diff.sponsorUpserts.filter((u) => u.action === "remove").map((u) => u.identityKey),
          },
        })
        .where(eq(syncRuns.id, run.id));
      return { status: "halted_for_review", runId: run.id, removalRatio: diff.removalRatio, sponsorsRemovedCount: diff.sponsorsRemovedCount };
    }

    const registerDate = new Date(source.registerPublicUpdatedAt);

    await db.transaction(async (tx) => {
      // Inserts are batched (one network round-trip per BATCH_SIZE rows, not per row) - a plain
      // per-row loop is fine for a handful of daily deltas but was measured to take 30+ minutes
      // over a real network connection for the ~127k-row baseline load, versus ~97s locally
      // against PGlite (no network RTT).
      const insertUpserts = diff.sponsorUpserts.filter((u) => u.action === "insert");
      const updateUpserts = diff.sponsorUpserts.filter((u) => u.action !== "insert");

      for (const batch of chunk(insertUpserts, BATCH_SIZE)) {
        if (batch.length === 0) continue;
        const inserted = await tx
          .insert(sponsors)
          .values(
            batch.map((u) => ({
              slug: assignSlug(u.displayName, u.town),
              matchKey: u.matchKey,
              displayName: u.displayName,
              town: u.town,
              county: u.county,
              region: u.region,
              sector: u.sector,
              nameVariants: u.nameVariants,
              status: "active" as const,
              firstSeenAt: registerDate,
              lastSeenAt: registerDate,
            }))
          )
          .returning();
        for (const row of inserted) {
          idByIdentityKey.set(identityKey(row.matchKey, row.town), row.id);
        }
      }

      // A per-row Promise.all here (fired on `tx`, pinned to one transactional connection) was
      // measured live (2026-08-25, run id 95) at ~184ms/row - basically one round-trip per row,
      // not pipelined the way the same pattern is for plain `db` queries outside a transaction.
      // 123 rows took 22.6s here alone, versus ~1s for a 193-row batched INSERT just before it.
      // A single multi-row UPDATE ... FROM (VALUES ...) is the reliable fix: one round-trip
      // regardless of how many rows, same principle as the batched inserts above.
      const toFieldUpdate = (u: (typeof updateUpserts)[number]) => {
        const id = idByIdentityKey.get(u.identityKey);
        if (!id) throw new Error(`No existing sponsor id for identity "${u.identityKey}" during ${u.action}`);
        return { id, displayName: u.displayName, town: u.town, county: u.county, region: u.region, sector: u.sector, nameVariants: u.nameVariants };
      };

      async function bulkUpdateSponsorFields(items: ReturnType<typeof toFieldUpdate>[], setSuffix: ReturnType<typeof sql>) {
        for (const batch of chunk(items, BATCH_SIZE)) {
          if (batch.length === 0) continue;
          const rows = sql.join(
            batch.map(
              (r) =>
                sql`(${r.id}::uuid, ${r.displayName}::text, ${r.town}::text, ${r.county}::text, ${r.region}::text, ${r.sector}::text, ${toPgTextArrayLiteral(r.nameVariants)}::text[])`
            ),
            sql`, `
          );
          await tx.execute(sql`
            update sponsors as s
            set display_name = v.display_name, town = v.town, county = v.county, region = v.region, sector = v.sector,
                name_variants = v.name_variants, updated_at = now(), ${setSuffix}
            from (values ${rows}) as v(id, display_name, town, county, region, sector, name_variants)
            where s.id = v.id
          `);
        }
      }

      await bulkUpdateSponsorFields(
        updateUpserts.filter((u) => u.action === "remove").map(toFieldUpdate),
        sql`status = 'unknown'`
      );
      // registerDate must be a string here, not a raw JS Date - confirmed live (2026-08-25, run
      // id 98): drizzle's `sql` template (unlike its typed .set()/.values() builders) hands the
      // value straight to postgres.js without Date serialization, which throws
      // ERR_INVALID_ARG_TYPE ("must be of type string ... Received an instance of Date").
      await bulkUpdateSponsorFields(
        updateUpserts.filter((u) => u.action !== "remove").map(toFieldUpdate),
        sql`status = 'active', last_seen_at = ${registerDate.toISOString()}::timestamptz`
      );

      const insertRoutes = diff.routeChanges.filter((rc) => rc.action === "add");
      const otherRoutes = diff.routeChanges.filter((rc) => rc.action !== "add");

      for (const batch of chunk(insertRoutes, BATCH_SIZE)) {
        if (batch.length === 0) continue;
        const values = batch.map((rc) => {
          const sponsorId = idByIdentityKey.get(rc.identityKey);
          if (!sponsorId) throw new Error(`No sponsor id for identity "${rc.identityKey}" during route insert`);
          return { sponsorId, route: rc.route, rating: rc.rating, sponsorType: rc.sponsorType, isCurrent: true, firstSeenAt: registerDate, lastSeenAt: registerDate };
        });
        await tx
          .insert(sponsorRoutes)
          .values(values)
          .onConflictDoUpdate({
            target: [sponsorRoutes.sponsorId, sponsorRoutes.route],
            targetWhere: eq(sponsorRoutes.isCurrent, true),
            set: { rating: sql`excluded.rating`, sponsorType: sql`excluded.sponsor_type`, isCurrent: true, lastSeenAt: registerDate },
          });
      }

      // Same fix as the sponsors update above - one multi-row UPDATE per batch instead of one
      // round-trip per row.
      const toRouteKey = (rc: (typeof otherRoutes)[number]) => {
        const sponsorId = idByIdentityKey.get(rc.identityKey);
        if (!sponsorId) throw new Error(`No sponsor id for identity "${rc.identityKey}" during route ${rc.action}`);
        return { sponsorId, route: rc.route, rating: rc.rating };
      };

      const deactivateRoutes = otherRoutes.filter((rc) => rc.action === "deactivate").map(toRouteKey);
      for (const batch of chunk(deactivateRoutes, BATCH_SIZE)) {
        if (batch.length === 0) continue;
        const rows = sql.join(
          batch.map((r) => sql`(${r.sponsorId}::uuid, ${r.route}::text)`),
          sql`, `
        );
        await tx.execute(sql`
          update sponsor_routes as sr
          set is_current = false, last_seen_at = ${registerDate.toISOString()}::timestamptz
          from (values ${rows}) as v(sponsor_id, route)
          where sr.sponsor_id = v.sponsor_id and sr.route = v.route and sr.is_current = true
        `);
      }

      const ratingUpdateRoutes = otherRoutes.filter((rc) => rc.action !== "deactivate").map(toRouteKey);
      for (const batch of chunk(ratingUpdateRoutes, BATCH_SIZE)) {
        if (batch.length === 0) continue;
        const rows = sql.join(
          batch.map((r) => sql`(${r.sponsorId}::uuid, ${r.route}::text, ${r.rating}::text)`),
          sql`, `
        );
        await tx.execute(sql`
          update sponsor_routes as sr
          set rating = v.rating, last_seen_at = ${registerDate.toISOString()}::timestamptz
          from (values ${rows}) as v(sponsor_id, route, rating)
          where sr.sponsor_id = v.sponsor_id and sr.route = v.route and sr.is_current = true
        `);
      }

      const eventRows = diff.events.map((e) => {
        const sponsorId = idByIdentityKey.get(e.identityKey);
        if (!sponsorId) throw new Error(`No sponsor id for identity "${e.identityKey}" while writing event`);
        return {
          sponsorId,
          syncRunId: run.id,
          eventType: e.eventType,
          occurredAt: registerDate,
          route: e.route ?? null,
          before: e.before ?? null,
          after: e.after ?? null,
          notes: e.notes ?? null,
        };
      });
      for (const batch of chunk(eventRows, BATCH_SIZE)) {
        if (batch.length) await tx.insert(sponsorEvents).values(batch);
      }

      await tx
        .update(syncRuns)
        .set({
          status: "success",
          finishedAt: new Date(),
          rowCount: parsed.rawRowCount,
          sponsorsActiveBefore: diff.sponsorsActiveBefore,
          sponsorsAddedCount: diff.sponsorsAddedCount,
          sponsorsRemovedCount: diff.sponsorsRemovedCount,
          sponsorsUpdatedCount: diff.sponsorsUpdatedCount,
        })
        .where(eq(syncRuns.id, run.id));
    });

    // Snapshot archival happens AFTER the sponsors/routes/events transaction has already
    // committed (syncRuns.status is set to "success" inside it, above) - a Blob storage
    // hiccup here must not fall through to the catch below and overwrite that to "failed".
    // That would misreport a real, already-committed success as a failure, which trips
    // /api/health's dead-man's-switch (lastRunOk checks the latest run's status) on a sync
    // that actually worked.
    try {
      const gzipped = await gzip(csvBuffer);
      const stored = await putSnapshot(`snapshots/${source.registerPublicUpdatedAt.slice(0, 10)}-${fileSha256.slice(0, 12)}.csv.gz`, gzipped);
      await db.insert(snapshots).values({
        syncRunId: run.id,
        fileSha256,
        blobUrl: stored.url,
        blobKey: stored.key,
        sizeBytes: gzipped.length,
      });
    } catch (err) {
      console.error(
        `[sync] Snapshot archival failed for run ${run.id} - sync itself already committed successfully, not retried/blocking:`,
        err
      );
    }

    return {
      status: "success",
      runId: run.id,
      rowCount: parsed.rawRowCount,
      sponsorsActiveBefore: diff.sponsorsActiveBefore,
      sponsorsAddedCount: diff.sponsorsAddedCount,
      sponsorsRemovedCount: diff.sponsorsRemovedCount,
      sponsorsUpdatedCount: diff.sponsorsUpdatedCount,
    };
  } catch (err) {
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    await db
      .update(syncRuns)
      .set({ status: "failed", finishedAt: new Date(), errorMessage: message })
      .where(eq(syncRuns.id, run.id));
    return { status: "failed", runId: run.id, error: message };
  }
}

async function gzip(buf: Buffer): Promise<Buffer> {
  const { gzipSync } = await import("node:zlib");
  return gzipSync(buf);
}
