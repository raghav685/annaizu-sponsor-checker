import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  numeric,
  serial,
  bigserial,
  index,
  uniqueIndex,
  date,
} from "drizzle-orm/pg-core";

/**
 * Phase 1 writes to: sync_runs, snapshots, staged_rows, sponsors, sponsor_routes, sponsor_events.
 * sponsor_review_queue / sponsor_links / companies_house_cache / daily_totals / daily_breakdowns
 * exist now (per adversarial schema review - retrofitting them later would require reprocessing
 * history) but stay empty until their respective later phases (rename/relocate detection,
 * Companies House integration, daily aggregates) are implemented.
 */

export const syncStatusEnum = pgEnum("sync_status", [
  "running",
  "success",
  "no_change",
  "failed",
  "halted_for_review",
]);

export const sponsorStatusEnum = pgEnum("sponsor_status", ["active", "withdrawn", "closed", "unknown"]);

export const sponsorEventTypeEnum = pgEnum("sponsor_event_type", [
  "added",
  "removed",
  "rating_changed",
  "route_added",
  "route_removed",
  "renamed",
  "relocated",
  "status_reclassified",
]);

export const reviewCandidateTypeEnum = pgEnum("review_candidate_type", ["rename", "relocate", "unmerge"]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "confirmed", "rejected"]);
export const sponsorLinkTypeEnum = pgEnum("sponsor_link_type", ["rename", "relocate", "merge"]);
export const industrySourceEnum = pgEnum("industry_source", ["companies_house", "keyword", "none"]);

// ---------------------------------------------------------------------------
// sync_runs
// ---------------------------------------------------------------------------
export const syncRuns = pgTable(
  "sync_runs",
  {
    id: serial("id").primaryKey(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: syncStatusEnum("status").notNull().default("running"),

    sourceContentApiUrl: text("source_content_api_url").notNull(),
    csvUrl: text("csv_url"),
    csvFilename: text("csv_filename"),
    fileSha256: text("file_sha256"),
    registerPublicUpdatedAt: timestamp("register_public_updated_at", { withTimezone: true }),

    rowCount: integer("row_count"),
    sponsorsActiveBefore: integer("sponsors_active_before"),
    sponsorsAddedCount: integer("sponsors_added_count"),
    sponsorsRemovedCount: integer("sponsors_removed_count"),
    sponsorsUpdatedCount: integer("sponsors_updated_count"),
    csvRowsRemovedCount: integer("csv_rows_removed_count"),

    haltSummary: jsonb("halt_summary"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewDecision: text("review_decision"),

    errorMessage: text("error_message"),
  },
  (t) => [
    // Only one sync can be actively running at a time - a stuck cron + a manual
    // retry must not race each other.
    uniqueIndex("sync_runs_one_running_uidx").on(t.status).where(sql`${t.status} = 'running'`),
    // Don't create a second halted-review row for the same file while one is pending.
    uniqueIndex("sync_runs_pending_halt_uidx").on(t.fileSha256).where(sql`${t.status} = 'halted_for_review'`),
  ]
);

// ---------------------------------------------------------------------------
// snapshots - one row per publish that actually changed; raw gzipped CSV
// bytes live in blob storage, this table only holds the pointer + metadata.
// ---------------------------------------------------------------------------
export const snapshots = pgTable("snapshots", {
  id: serial("id").primaryKey(),
  syncRunId: integer("sync_run_id")
    .notNull()
    .unique()
    .references(() => syncRuns.id),
  fileSha256: text("file_sha256").notNull().unique(),
  blobUrl: text("blob_url").notNull(),
  blobKey: text("blob_key").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// staged_rows - parsed CSV rows land here BEFORE touching live tables, so the
// >2% halt check and the diff are SQL joins against durable data, and a halted
// run leaves something a human can actually inspect (re-fetching the CSV later
// may no longer match the hash that triggered the halt).
// ---------------------------------------------------------------------------
export const stagedRows = pgTable(
  "staged_rows",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    syncRunId: integer("sync_run_id")
      .notNull()
      .references(() => syncRuns.id),
    matchKey: text("match_key").notNull(),
    displayName: text("display_name").notNull(),
    town: text("town").notNull(),
    county: text("county").notNull().default(""),
    region: text("region").notNull(),
    sector: text("sector").notNull(),
    route: text("route").notNull(),
    rating: text("rating"), // 'A' | 'B' | null
    sponsorType: text("sponsor_type").notNull(), // 'Worker' | 'Temporary Worker'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("staged_rows_sync_run_match_key_idx").on(t.syncRunId, t.matchKey)]
);

// ---------------------------------------------------------------------------
// sponsors - canonical entity, keyed by a stable UUID.
//
// match_key (normalised org name) is NOT globally unique on its own: ~1,024
// real organisations in the register share an identical name across multiple
// towns (multi-branch operators, e.g. "1st Choice Cabs Ltd" in both London
// and Ilford, "Riverside Medical Practice" across 7 sites) - discovered by
// running the pipeline against the real data, not a hypothetical. Each branch
// is a distinct licence that can be added/removed independently, so the
// natural key is (match_key, town). match_key alone stays indexed (not
// unique) for the Phase 2 relocate heuristic, which searches "other sponsors
// with this match_key in a different town".
// ---------------------------------------------------------------------------
export const sponsors = pgTable(
  "sponsors",
  {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Assigned once at insert time (see runSync.ts) and kept stable for the
  // sponsor's lifetime, including through reactivation - detail-page
  // permalinks and the sitemap depend on this never silently changing.
  slug: text("slug").notNull().unique(),
  matchKey: text("match_key").notNull(),
  displayName: text("display_name").notNull(),
  // Every distinct raw org-name spelling ever merged into this identity
  // (accumulates across runs). Makes every merge inspectable/reversible -
  // see docs/data-pipeline.md.
  nameVariants: text("name_variants").array().notNull().default(sql`ARRAY[]::text[]`),
  town: text("town").notNull(),
  county: text("county").notNull().default(""),
  region: text("region").notNull(),
  sector: text("sector").notNull(),
  industrySource: industrySourceEnum("industry_source").notNull().default("keyword"),
  sicCode: text("sic_code"),

  status: sponsorStatusEnum("status").notNull().default("active"),
  statusConfidence: numeric("status_confidence"),

  companiesHouseNumber: text("companies_house_number"),
  companiesHouseMatchConfidence: numeric("companies_house_match_confidence"),
  companiesHouseMatchedAt: timestamp("companies_house_matched_at", { withTimezone: true }),

  // Self-FK so a later identity-merge (see sponsor_links) can redirect lookups
  // to the surviving sponsor in O(1) without rewriting historical event rows.
  mergedIntoId: uuid("merged_into_id"),

  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sponsors_match_key_town_uidx").on(t.matchKey, t.town),
    index("sponsors_match_key_idx").on(t.matchKey),
  ]
);

// ---------------------------------------------------------------------------
// sponsor_routes - sponsor x route, with rating carried per-route (a sponsor
// can hold different ratings on different routes).
// ---------------------------------------------------------------------------
export const sponsorRoutes = pgTable(
  "sponsor_routes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sponsorId: uuid("sponsor_id")
      .notNull()
      .references(() => sponsors.id),
    route: text("route").notNull(),
    rating: text("rating"), // 'A' | 'B' | null
    sponsorType: text("sponsor_type").notNull(), // 'Worker' | 'Temporary Worker', from the source CSV directly
    isCurrent: boolean("is_current").notNull().default(true),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    // At most one "current" row per (sponsor, route) - re-diffing unchanged
    // data must UPDATE this row, never insert a duplicate.
    uniqueIndex("sponsor_routes_current_uidx").on(t.sponsorId, t.route).where(sql`${t.isCurrent}`),
  ]
);

// ---------------------------------------------------------------------------
// sponsor_events - the diff log. Every stat/chart on the site must be
// derivable from this table alone. `before`/`after` always carry the FULL
// dimensional tuple for that event type (not a partial diff), so historical
// state doesn't depend on mutable current-state columns in `sponsors`.
// ---------------------------------------------------------------------------
export const sponsorEvents = pgTable(
  "sponsor_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sponsorId: uuid("sponsor_id")
      .notNull()
      .references(() => sponsors.id),
    // Nullable: register-diff events always set this; Companies House
    // reclassification events (status_reclassified) aren't tied to a
    // register sync run at all, so forcing one here would be dishonest.
    syncRunId: integer("sync_run_id").references(() => syncRuns.id),
    eventType: sponsorEventTypeEnum("event_type").notNull(),
    // Pinned to the register's own publish date (sync_runs.registerPublicUpdatedAt),
    // never job wall-clock - a delayed/retried job must not shift historical dates.
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    route: text("route"), // set for route_added / route_removed / rating_changed
    before: jsonb("before"),
    after: jsonb("after"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Idempotency: the same logical event must never be written twice for one run.
    uniqueIndex("sponsor_events_dedupe_uidx").on(
      t.syncRunId,
      t.sponsorId,
      t.eventType,
      sql`COALESCE(${t.route}, '')`
    ),
    index("sponsor_events_sponsor_time_idx").on(t.sponsorId, t.occurredAt, t.id),
  ]
);

// ---------------------------------------------------------------------------
// sponsor_review_queue - borderline rename/relocate candidates. Confirming a
// candidate mutates the EXISTING sponsors row in place (same UUID, continuous
// history) - it never inserts a new sponsor.
// ---------------------------------------------------------------------------
export const sponsorReviewQueue = pgTable("sponsor_review_queue", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  // Nullable: rename/relocate candidates come from a register sync run;
  // unmerge candidates come from Companies House matching, which isn't
  // tied to any particular register sync.
  syncRunId: integer("sync_run_id").references(() => syncRuns.id),
  candidateType: reviewCandidateTypeEnum("candidate_type").notNull(),
  oldSponsorId: uuid("old_sponsor_id")
    .notNull()
    .references(() => sponsors.id),
  newRowRaw: jsonb("new_row_raw").notNull(),
  similarityScore: numeric("similarity_score").notNull(),
  status: reviewStatusEnum("status").notNull().default("pending"),
  resultingSponsorId: uuid("resulting_sponsor_id").references(() => sponsors.id),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// sponsor_links - identity-merge trail for renames/relocations, including
// retroactive reconciliation of sponsors mis-split before rename detection shipped.
// ---------------------------------------------------------------------------
export const sponsorLinks = pgTable("sponsor_links", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  fromSponsorId: uuid("from_sponsor_id")
    .notNull()
    .references(() => sponsors.id),
  toSponsorId: uuid("to_sponsor_id")
    .notNull()
    .references(() => sponsors.id),
  linkType: sponsorLinkTypeEnum("link_type").notNull(),
  syncRunId: integer("sync_run_id").references(() => syncRuns.id),
  confidence: numeric("confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// companies_house_cache - Phase 3. Cached lookups, rate-limit-aware.
// ---------------------------------------------------------------------------
export const companiesHouseCache = pgTable(
  "companies_house_cache",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    queryName: text("query_name").notNull(),
    matchedCompanyNumber: text("matched_company_number"),
    matchedCompanyName: text("matched_company_name"),
    matchConfidence: numeric("match_confidence"),
    companyStatus: text("company_status"),
    sicCodes: text("sic_codes").array(),
    rawResponse: jsonb("raw_response"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [index("companies_house_cache_query_name_idx").on(t.queryName)]
);

// ---------------------------------------------------------------------------
// daily_totals / daily_breakdowns - Phase 4 precomputed rollups for analytics.
// ---------------------------------------------------------------------------
export const dailyTotals = pgTable("daily_totals", {
  date: date("date").primaryKey(),
  activeCount: integer("active_count").notNull(),
  withdrawnCount: integer("withdrawn_count").notNull(),
  closedCount: integer("closed_count").notNull(),
  addedCount: integer("added_count").notNull(),
  removedCount: integer("removed_count").notNull(),
  updatedCount: integer("updated_count").notNull(),
});

export const dailyBreakdowns = pgTable(
  "daily_breakdowns",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    date: date("date").notNull(),
    dimensionType: text("dimension_type").notNull(), // 'region' | 'sector' | 'route' | 'rating'
    dimensionValue: text("dimension_value").notNull(),
    count: integer("count").notNull(),
  },
  (t) => [uniqueIndex("daily_breakdowns_unique_idx").on(t.date, t.dimensionType, t.dimensionValue)]
);
