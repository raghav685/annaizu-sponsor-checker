# Data pipeline

Phase 1 of the sync/DB rebuild. Covers source resolution, schema, diff logic,
matching thresholds, and known failure modes/limitations.

## Status: what's implemented vs deferred

**Implemented:** Content-API source resolution, hash-gated sync, staging,
transactional diff/commit, plain `added`/`removed`/`rating_changed`/
`route_added`/`route_removed` events, the `staged_rows` audit table, the
`>2%` removal halt, snapshot storage, `/api/health` (with an external
dead-man's-switch contract), Vercel Cron scheduling + manual trigger + visible
run history (`/sync-status`), full operational alerting, the frontend cutover
(nothing reads from static JSON), and Companies House status classification +
industry backfill (rate-limited, queued, cached).

**Deferred to later phases** (tables exist in the schema now so nothing needs
reprocessing later, but nothing populates them yet):
- Rename/relocate detection proper (`sponsor_review_queue` candidate types
  `rename`/`relocate`, `sponsor_links`) - Phase 2. (`unmerge` candidates,
  from Companies House variant-divergence detection, ARE implemented.)
- `daily_totals` / `daily_breakdowns` precomputed rollups for the analytics
  page - Phase 4.
- The Reportable Change Scanner - next.

## Scheduling & operational safety

**Platform: Vercel Cron.** `vercel.json` schedules `GET /api/sync/trigger`
daily. The same route accepts an authorized `POST` for a manual trigger -
there's no separate manual endpoint. Both Vercel Cron (which calls with GET)
and a manual call use `Authorization: Bearer $CRON_SECRET`.

**Performance finding:** the original assumption that "daily deltas are
cheap" was untested and, worse, wrong as originally written - the diff engine
was unconditionally writing a no-op `update` row for every unchanged sponsor
on every run, meaning a "small delta" publish cost exactly as much database
work as a large one (~127k writes either way). Fixed: `computeDiff` now skips
any sponsor whose fields are byte-identical to current state. Measured (local
PGlite, three consecutive runs): a full changed-publish run through the real
`/api/sync/trigger` route - fetch 11MB, resolve via Content API, parse ~127k
sponsors, stage ~141k rows, load current live state, diff, transactional
commit - takes **~12.1-12.6s**, comfortably inside the route's 60s
`maxDuration`. This does NOT yet include real Neon network latency per query;
re-verify once `DATABASE_URL` points at production. The one-time baseline
load (~127k inserts, nothing to diff against) took **~97s** via the CLI in
the same environment - that one runs via `npm run sync` against
`DATABASE_URL` directly, not through the serverless route.

**Known rough edge:** if the snapshot upload/insert fails AFTER the sponsor
diff has already committed successfully, the whole run is still marked
`failed` (there's no distinct "data committed, audit trail didn't" status).
Rare in practice (observed only when the sync accidentally re-fetches
byte-identical content in testing) but worth fixing before Phase 4 relies
heavily on `sync_runs.status` for aggregate freshness.

**Dead-man's-switch.** Everything in `alerts.ts` runs *after* a sync executes
- it cannot detect cron going silent entirely (bad secret, quota, a deploy
that drops `vercel.json`). `/api/health` is designed for this instead: it now
tracks `hoursSinceLastAttempt` (time since ANY `sync_runs` row was created,
regardless of status - separate from `daysSinceRegisterChanged`, which can
look perfectly normal while cron is dead) and returns **HTTP 503** (not just
`healthy: false` in the body) once that exceeds 36h. Point any external
uptime monitor (UptimeRobot, Healthchecks.io, Better Uptime all have free
tiers) at `GET /api/health` every 30-60 minutes, alert on non-200 - no
JSON-path assertions needed. This must run off-platform; a Vercel-hosted
check can't detect Vercel Cron itself failing.

**Hardening:** `/api/sync/trigger` and `/api/companies-house/process` are
both `force-dynamic`, `revalidate: 0`, `Cache-Control: no-store`, and
`X-Robots-Tag: noindex` - state-mutating GET endpoints must never be cached
or crawled. `robots.txt` explicitly disallows `/api/` and `/sync-status`.

## Companies House integration

Free-tier API, 600 requests/5min. `src/lib/companiesHouse/`:
- `client.ts` - thin fetch wrapper (HTTP Basic auth, key as username).
- `cache.ts` - caches every lookup for 30 days (`companies_house_cache`);
  rate budget is tracked as *lookups* (cache misses), capped at 250 per
  5-minute window even though each lookup can cost up to 2 real requests
  (search + profile) - a lookup-based cap stays safely under 600 even in the
  worst case, where a request-based cap of the same number would not.
- `match.ts` - tries **every raw name variant** on record for a sponsor, not
  just the canonical display name. If variants resolve to different
  *confident* company numbers (similarity >= 0.82), that's treated as a
  signal the merge itself may be wrong: routed to `sponsor_review_queue` as
  an `unmerge` candidate, never guessed. A single low-confidence hit is
  treated as no match at all, not accepted as the best available option -
  see `tests/companiesHouseMatch.test.ts` for the exact behavior, including
  the case a wrong-but-only search hit must NOT be accepted.
- `processQueue.ts` - priority order: removed sponsors (`status = 'unknown'`)
  first, since that's what unblocks the withdrawn/closed KPI split; then
  background backfill of active sponsors with no Companies House data yet.
  Reclassification emits a `status_reclassified` `sponsor_events` row
  (`sync_run_id` is nullable - this isn't tied to any register sync).

**Triggering it regularly**: `/api/companies-house/process` uses the same
`CRON_SECRET` auth as the register sync, processing one bounded batch per
call. Vercel Cron on the **Hobby plan only supports once-daily schedules**,
far too infrequent for a rate-limited queue meant to run every few minutes.
Either upgrade to Pro (supports frequent cron) or point an external scheduler
(cron-job.org, a GitHub Actions scheduled workflow, etc.) at this route every
5-10 minutes with the bearer token. Not wired into `vercel.json` yet pending
that choice.

## Reversibility: raw name variants and the merge audit

Every raw organisation-name spelling that gets merged into one sponsor
identity is stored on `sponsors.name_variants` (accumulates across runs,
never overwritten - see `computeDiff`'s `unionVariants`). This makes every
merge inspectable after the fact, and is what `match.ts` uses to catch a
merge that conflates two genuinely different registered entities (e.g. "X
Ltd" and "X LLP" in the same town, which can be two separate businesses).

**Manually audited all ~473 real merge groups** the parser produces before
shipping this (not just spot-checked): 206 pure case/whitespace/punctuation
variants, 260 differ only by legal suffix, 7 flagged by a stricter secondary
check that turned out on inspection to also just be `&`/`and` variants.
**Zero false-positive merges found in the current register.** Companies
House matching is the ongoing, automatic check going forward - see above.

**Rebuilding from scratch if the merge rule changes:** yes, this is possible
in principle - `snapshots` stores every changed publish's raw gzipped CSV
forever, and `parseRegisterCsv()` + `computeDiff()` are pure functions of
that raw text plus current DB state. A dedicated "replay N snapshots through
a new rule and diff against production" tool doesn't exist yet - out of
scope unless you want it built now, but nothing about the schema or pipeline
design blocks it.

**Known Phase 1 limitation - read this before trusting `removed` events:**
Without rename/relocate detection, a sponsor that is renamed or moves town
between publishes shows up here as a plain `removed` (old identity) +
`added` (new identity) pair, not a `renamed`/`relocated` event. This is an
explicitly accepted tradeoff, not an oversight - `sponsor_links` exists
specifically so Phase 2 can retroactively reconcile any such pairs by
inserting a link row, without touching the original `sponsor_events` history.
Until Phase 2 ships, treat `removed` counts as "left the register or was
renamed/relocated", not strictly "the licence was revoked."

## What counts toward `sponsorsUpdatedCount` (the "records updated" KPI tile)

Only route-level substance: `route_added`, `route_removed`, `rating_changed`.
Cosmetic drift in `county`/`region`/`sector`/name-casing is written to the
record (so it stays current) but deliberately does **not** increment this
counter - a Home Office text-formatting change isn't a "change" a user should
be told about. Locked in by `tests/diff.test.ts` ("cosmetic-only drift...
does NOT count toward sponsorsUpdatedCount" / "a real route/rating change
DOES count").

`displayName` (name) drift on an otherwise-continuing sponsor (same
`match_key` + `town`) is currently treated as cosmetic too, not substantive -
deliberately, not by omission. Reasoning: a *genuine* name change almost
always changes `match_key` as well (since it's built from the name), so a
real rename shows up as its own `removed`+`added` pair already reflected in
those counts - what's left over as "displayName changed but match_key
didn't" is overwhelmingly suffix/formatting noise ("Ltd" vs "Limited"
appearing inconsistently across publishes), not a business event worth a
user-facing "updated" notification. Revisit this once Phase 2's real rename
detection exists and the `removed`+`added` pairs it currently produces get
reconciled instead.

## Source resolution

Source of truth: the GOV.UK **Content API**, not the HTML page or a hardcoded
CSV URL (the asset lives behind a rotating content hash and the naming
convention has changed before).

```
GET https://www.gov.uk/api/content/government/publications/register-of-licensed-sponsors-workers
```

Verified fields (checked against the live API, not assumed):
- `public_updated_at` (top-level, ISO 8601 with offset) - the register's own
  freshness date. This is what `sync_runs.register_public_updated_at` and
  every `sponsor_events.occurred_at` are pinned to - never job wall-clock,
  so a delayed or retried job doesn't shift historical dates.
- `details.attachments[]` - filtered to `content_type === "text/csv"`. If
  more than one CSV is present, the one with the latest `YYYY-MM-DD` embedded
  in its filename wins; if none can be parsed, resolution fails loudly rather
  than guessing.

See `scripts/lib/contentApi.ts`.

## Identity: match_key is not globally unique

Build the match key by uppercasing, stripping punctuation, collapsing
whitespace, unifying `&`/`and`, and dropping legal suffixes (LTD, LIMITED,
PLC, LLP, LLC, THE, CIC, CIO). See `scripts/lib/matchKey.ts`.

**This alone is not a unique identity.** Running the real register through
this pipeline surfaced two real collision classes:

1. **~1,024 genuine multi-branch organisations** share an identical name
   across different towns (e.g. "1st Choice Cabs Ltd" in both London and
   Ilford; "Riverside Medical Practice" across 7 sites). These are legitimately
   separate licences that can be added/removed independently - collapsing them
   into one row would lose that distinction.
2. **~484 raw spelling/casing/legal-suffix variants** of the same organisation
   in the *same* town (e.g. "AAB Business And Tax Advisory" vs "AAB BUSINESS
   AND TAX ADVISORY LLP") - these genuinely are the same sponsor and are
   merged during parsing (`scripts/lib/parseRegister.ts`), unioning their routes.

The natural key used everywhere in the diff engine and the DB is therefore
the **composite `(match_key, town)`** - `identityKey()` in `scripts/lib/diff.ts`,
enforced by a unique index `sponsors_match_key_town_uidx` in the schema.
`match_key` alone stays indexed (not unique) for the Phase 2 relocate search
("other sponsors with this match_key in a different town").

## Diff engine

Pure, side-effect-free function: `computeDiff(currentState, stagedState)` in
`scripts/lib/diff.ts`. No DB/IO - this is what makes it unit-testable in
isolation (see `tests/diff.test.ts`).

Rules, in order:
1. **Staged sponsor not in current state (by identity)** → `added`, full
   dimensional tuple recorded in `after`.
2. **Staged sponsor matches a current sponsor whose status is not `active`**
   → matched by identity *regardless of status* (so a re-appearing sponsor
   reuses its existing UUID, never a new row) → `added` with a
   `"reappeared after previous removal"` note.
3. **Staged sponsor matches an active current sponsor** → diff routes:
   new route → `route_added`; route present in both with a different rating
   → `rating_changed`; route missing from staged → `route_removed`. Display
   fields (name casing, county) are silently refreshed with no event -
   real relocation detection is Phase 2.
4. **Active current sponsor missing from staged data** → `removed`, full
   dimensional tuple recorded in `before`.

`before`/`after` always carry the **full dimensional tuple** for
sponsor-level events (name, town, county, region, sector, routes), not a
partial diff - so historical state can be reconstructed from `sponsor_events`
alone without depending on mutable current-state columns in `sponsors`.

### Halt threshold

`sponsorsRemovedCount / sponsorsActiveBefore`, both counted at the **sponsor**
level (not raw CSV row deltas, which are one row per sponsor×route and would
let route/rating churn on still-active sponsors trip a false halt). If this
ratio exceeds 2% and there was at least one active sponsor before the run,
the sync halts: `sync_runs.status = 'halted_for_review'`, live tables are
left completely untouched, and `staged_rows` for that run are kept (not
truncated) so a human can inspect exactly what would have been removed via
`sync_runs.halt_summary`. Resolving a halt currently requires manual DB
intervention (a Phase 2+ admin flow is not built yet).

## Transactional commit

1. Resolve source, download CSV, hash it.
2. Hash matches the last successful/no-change run → insert a `no_change`
   `sync_runs` row, exit. Nothing else touched.
3. Insert a `running` `sync_runs` row - `sync_runs_one_running_uidx` (a
   partial unique index on `status = 'running'`) rejects a second concurrent
   run outright, so this insert *is* the concurrency guard.
4. Parse, bulk-insert into `staged_rows` (durable even if the run later halts).
5. Load current live state, run `computeDiff`.
6. If over the halt threshold: mark `halted_for_review` with a summary, stop.
7. Otherwise, in a **single DB transaction**: upsert `sponsors`, upsert/
   deactivate `sponsor_routes`, insert `sponsor_events`, mark `sync_runs`
   `success`. A crash here rolls back cleanly; nothing partial is ever visible.
8. Upload the gzipped CSV to blob storage, record the `snapshots` row.

Re-running the whole pipeline on unchanged source data is a no-op past step 2
- verified against the live register (127,100 sponsors, zero spurious events
on the second run).

## Local dev vs production

No Docker/Postgres is available in this dev environment, so:
- **Local dev**: PGlite (`@electric-sql/pglite`), an embedded WASM Postgres,
  file-backed under `.pglite-data/` (gitignored). Migrations are plain
  Postgres SQL either way, so they apply unchanged. **Requires explicitly
  setting `DB_DRIVER=pglite`** - there is deliberately no silent fallback to
  it. `src/db/client.ts` used to default to PGlite whenever `DATABASE_URL`
  was unset, which meant a misconfigured environment would happily run a
  sync against a throwaway local DB and report success, indistinguishable
  from a real run against production. Now, missing both `DATABASE_URL` and
  `DB_DRIVER=pglite` throws immediately. Every `runSync()` call and the
  migration script also print `describeDbTarget()` (driver + host, no
  credentials) as their first line of output, so the target is stated, not
  inferred.
- **Production**: set `DATABASE_URL` (Neon). Uses `drizzle-orm/neon-serverless`
  (`Pool` over WebSocket) specifically - **not** `neon-http`, which is
  stateless HTTP-per-query and does not support transactions at all, which
  the staging→swap commit hard-requires.
- Both are excluded from webpack bundling via `serverExternalPackages` in
  `next.config.ts` - PGlite loads its WASM binary via `import.meta.url`-relative
  paths that break under webpack's bundling.
- Snapshot storage: Vercel Blob in production (`BLOB_READ_WRITE_TOKEN`);
  falls back to a local gitignored `.snapshots/` directory in dev with the
  same interface (`src/lib/snapshotStorage.ts`).
- A future fuzzy-matching phase using Postgres `pg_trgm` will need to import
  it explicitly for PGlite (`@electric-sql/pglite/contrib/pg_trgm`) even
  though `CREATE EXTENSION pg_trgm` works unchanged on Neon - not needed yet
  since Phase 1's `similarity()` is a dependency-free JS Levenshtein function.
- Any concurrency guard that isn't a plain DB constraint (e.g. an advisory
  lock) cannot be meaningfully tested against PGlite, which is effectively
  single-connection. Phase 1's guard is a partial unique index instead
  (works identically on both), specifically to sidestep this.

## Commands

```
npm run db:generate   # regenerate SQL migrations from src/db/schema.ts
npm run db:migrate    # apply migrations (PGlite locally, Neon in prod via DATABASE_URL)
npm run sync          # run one sync (idempotent, safe to re-run)
npm test              # CSV parser, diff engine, and match-key normalisation tests
```

## Test coverage

- `tests/parseRegister.test.ts` - header-name mapping (fails loudly on a
  missing column), multi-route collapsing, multi-branch vs same-org-variant
  disambiguation, per-route rating, sponsor type, `&`/`and` normalisation.
- `tests/diff.test.ts` - baseline load, idempotency (zero events on an
  unchanged re-run), plain removal, reappearing-sponsor identity matching,
  route add/remove/rating-change, multi-branch independence, halt-ratio
  correctness (sponsor-level, not row-level).
- `tests/matchKey.test.ts` - normalisation rules, Levenshtein similarity
  scoring (used by the Phase 2 rename/relocate heuristic, not yet wired up).
- **Not yet applicable**: a removed-sponsor *classifier* test - Companies
  House classification is Phase 3 and doesn't exist yet.
