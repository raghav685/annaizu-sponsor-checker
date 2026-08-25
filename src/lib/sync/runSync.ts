/**
 * Core sync orchestration, importable from both the CLI (scripts/sync.ts) and
 * the scheduled/manual trigger API route - one code path, no drift between
 * "what cron runs" and "what you run by hand".
 */
import { createHash } from "node:crypto";
import { and, eq, desc, sql } from "drizzle-orm";
import { db, describeDbTarget } from "@/db/client";
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
// just a killed run). Raised 6x to cut round-trips proportionally; still comfortably under
// Postgres's ~65,535-parameter-per-query limit for every table this batches (the widest is
// sponsors at 11 columns: 3000 x 11 = 33,000).
const BATCH_SIZE = 3000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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
    for (const batch of chunk(stagingRows, BATCH_SIZE)) {
      await db.insert(stagedRows).values(batch);
    }

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
      // against PGlite (no network RTT). Updates stay per-row: on any real day there are at most
      // a few hundred, so batching them isn't worth the added complexity.
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

      for (const u of updateUpserts) {
        const id = idByIdentityKey.get(u.identityKey);
        if (!id) throw new Error(`No existing sponsor id for identity "${u.identityKey}" during ${u.action}`);
        await tx
          .update(sponsors)
          .set(
            u.action === "remove"
              ? { displayName: u.displayName, town: u.town, county: u.county, region: u.region, sector: u.sector, nameVariants: u.nameVariants, status: "unknown", updatedAt: new Date() }
              : { displayName: u.displayName, town: u.town, county: u.county, region: u.region, sector: u.sector, nameVariants: u.nameVariants, status: "active", lastSeenAt: registerDate, updatedAt: new Date() }
          )
          .where(eq(sponsors.id, id));
      }

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

      for (const rc of otherRoutes) {
        const sponsorId = idByIdentityKey.get(rc.identityKey);
        if (!sponsorId) throw new Error(`No sponsor id for identity "${rc.identityKey}" during route ${rc.action}`);
        if (rc.action === "deactivate") {
          await tx
            .update(sponsorRoutes)
            .set({ isCurrent: false, lastSeenAt: registerDate })
            .where(and(eq(sponsorRoutes.sponsorId, sponsorId), eq(sponsorRoutes.route, rc.route), eq(sponsorRoutes.isCurrent, true)));
        } else {
          await tx
            .update(sponsorRoutes)
            .set({ rating: rc.rating, lastSeenAt: registerDate })
            .where(and(eq(sponsorRoutes.sponsorId, sponsorId), eq(sponsorRoutes.route, rc.route), eq(sponsorRoutes.isCurrent, true)));
        }
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

    const gzipped = await gzip(csvBuffer);
    const stored = await putSnapshot(`snapshots/${source.registerPublicUpdatedAt.slice(0, 10)}-${fileSha256.slice(0, 12)}.csv.gz`, gzipped);
    await db.insert(snapshots).values({
      syncRunId: run.id,
      fileSha256,
      blobUrl: stored.url,
      blobKey: stored.key,
      sizeBytes: gzipped.length,
    });

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
