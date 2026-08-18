import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
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
// Uses the neon-serverless (WebSocket/Pool) driver rather than neon-http: the
// sync pipeline requires real transactions for the staging->swap import, and
// neon-http is stateless HTTP-per-query with no transaction support at all.
function createDb() {
  const explicitPglite = process.env.DB_DRIVER === "pglite";

  if (!explicitPglite) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set, and DB_DRIVER=pglite was not explicitly requested. " +
          "Refusing to silently fall back to a local embedded DB. Set DATABASE_URL for a real " +
          "Postgres/Neon connection, or set DB_DRIVER=pglite to explicitly opt into local dev."
      );
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return { db: drizzleNeon(pool, { schema }), driver: "neon" as const, client: null as PGlite | null };
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
  if (dbDriver === "neon") {
    try {
      const host = new URL(process.env.DATABASE_URL!).hostname;
      return `neon (${host})`;
    } catch {
      return "neon (unparseable DATABASE_URL host)";
    }
  }
  return "pglite (local, .pglite-data/ - DB_DRIVER=pglite was explicitly set)";
}
