import path from "node:path";
import { db, dbDriver, describeDbTarget } from "./client";

async function main() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  console.log(`[migrate] Target: ${describeDbTarget()}`);
  console.log(`[migrate] Applying migrations from ${migrationsFolder} via ${dbDriver} driver...`);

  if (dbDriver === "neon") {
    const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder });
  }

  console.log("[migrate] Done.");
}

// Explicit exit: the PGlite/Neon connection has no automatic close and keeps
// the event loop alive indefinitely once migrations are applied - without
// this, the script prints "Done." and then hangs forever.
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[migrate] Failed:", err);
    process.exit(1);
  });
