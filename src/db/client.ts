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
// Standard Postgres wire protocol (postgres-js), not a Neon-specific driver -
// the database is Supabase (moved off Neon after its free-tier data transfer
// quota was exhausted). `prepare: false` is required when the connection
// string routes through pgbouncer in transaction-pooling mode (Supabase's
// pooled connection does) - prepared statements aren't safe to reuse across
// pooled connections that can be handed to a different backend per query.
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
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    return { db: drizzlePostgres(client, { schema }), driver: "postgres" as const, client: null as PGlite | null };
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
