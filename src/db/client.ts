import postgres from "postgres";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

// PGlite (embedded, file-backed local dev DB) is opt-IN only, via
// DB_DRIVER=pglite. Previously this defaulted to PGlite whenever DATABASE_URL
// was unset - a silent fallback that would happily let a real sync run and
// report success against a throwaway local DB while everyone believed it hit
// production. Now: no DATABASE_URL and no explicit opt-in throws immediately,
// so a misconfigured environment fails loudly instead of producing numbers
// that look real but aren't.
//
// Standard Postgres wire protocol (postgres-js), not tied to any specific
// provider - the database has moved twice (Neon -> Supabase -> Aiven), both
// times because a free-tier data-transfer/egress quota was exhausted, not
// because of anything provider-specific. See the 2026-08-21 commits fixing
// the actual causes (a sitemap route re-fetching the full active-sponsor
// list 5x per build, and ~6,800 browse pages being eagerly statically
// generated instead of the top few hundred) before assuming a third move
// will be needed. `prepare: false` stays set regardless of provider - it's
// required whenever the connection string routes through a pooler in
// transaction-pooling mode (Supabase's pooled connection did; harmless to
// keep even against a provider that doesn't pool, like Aiven's free tier).
function createDb() {
  const explicitPglite = process.env.DB_DRIVER === "pglite";

  if (!explicitPglite) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set, and DB_DRIVER=pglite was not explicitly requested. " +
          "Refusing to silently fall back to a local embedded DB. Set DATABASE_URL for a real " +
          "Postgres connection, or set DB_DRIVER=pglite to explicitly opt into local dev."
      );
    }
    // max/idle_timeout matter a lot more here than on a normal deployment: postgres.js defaults
    // to max:10 idle_timeout:null (connections held open forever), and this module-scoped client
    // is cached per warm serverless instance (see getInstance() below) - Vercel Fluid Compute can
    // keep many instances warm at once, each with its own pool. Confirmed live 3x (2026-08-25):
    // Aiven's free tier only has ~20 non-reserved connection slots, and normal traffic across a
    // handful of warm instances was enough to exhaust them repeatedly, taking every DB-backed
    // route (and every subsequent build, which queries the same DB for static generation) down
    // with "remaining connection slots are reserved for roles with the SUPERUSER attribute".
    // idle_timeout alone did NOT fix this (confirmed - 12 idle connections up to several minutes
    // old were still open when checked): serverless instances freeze between invocations, and a
    // frozen instance's JS event loop can't run the setTimeout that would close an idle
    // connection, so idle_timeout only fires if the instance happens to be unfrozen for another
    // invocation after the timeout elapses - not guaranteed, and not a real fix on its own.
    // max:1 is the actual load-bearing setting here: it caps the worst case (N warm instances x 1
    // connection each) far below max:10, and is the most this app needs since nothing in it
    // requires two genuinely-simultaneous queries on the same request badly enough to justify the
    // extra connection budget. A real fix beyond this would mean an Aiven connection-pooling
    // (PgBouncer-style) endpoint if one exists on this plan, or closing the connection explicitly
    // after every request via Next.js's after() - out of scope for this pass.
    const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, idle_timeout: 20, max_lifetime: 60 * 30 });
    return { db: drizzlePostgres(client, { schema }), driver: "postgres" as const, client };
  }

  const client = new PGlite("./.pglite-data");
  return { db: drizzlePglite(client, { schema }), driver: "pglite" as const, client };
}

type DbHandle = ReturnType<typeof createDb>;

declare global {
  var __sponsorDb: DbHandle | undefined;
}

function getInstance(): DbHandle {
  if (!global.__sponsorDb) {
    global.__sponsorDb = createDb();
  }
  return global.__sponsorDb;
}

export const dbHandle = getInstance();
export const db = dbHandle.db;
export const dbDriver = dbHandle.driver;

/** The raw postgres-js client, for operations drizzle doesn't expose (e.g. COPY streaming). */
export function getRawPostgresClient(): postgres.Sql {
  if (dbHandle.driver !== "postgres") {
    throw new Error("getRawPostgresClient() was called while running against pglite (DB_DRIVER=pglite)");
  }
  return dbHandle.client as postgres.Sql;
}

/** Safe-to-log description of what this process is actually writing to - never includes credentials. */
export function describeDbTarget(): string {
  if (dbDriver === "postgres") {
    try {
      const host = new URL(process.env.DATABASE_URL!).hostname;
      return `postgres (${host})`;
    } catch {
      return "postgres (unparseable DATABASE_URL host)";
    }
  }
  return "pglite (local, .pglite-data/ - DB_DRIVER=pglite was explicitly set)";
}
