/**
 * One-off data copy from the current production Postgres (Supabase, DATABASE_URL) to the new
 * Aiven instance (AIVEN_DATABASE_URL_BY_IP), run after `npm run db:migrate` has already created
 * the schema on Aiven. Copies every row, table by table, in FK-safe order, batched to stay
 * gentle on both ends. Read-only against the source - never touches Supabase's data, only reads
 * it, so it's safe to re-run if interrupted (each table is wiped and reloaded on the target,
 * not appended to).
 *
 * Usage: npx tsx scripts/migrateToAiven.ts
 */
import postgres from "postgres";

const BATCH_SIZE = 1000;

// Parent tables before children. sponsors.merged_into_id is a nullable self-FK and is always
// null today (Phase 2 unmerge/rename detection isn't implemented yet - see DECISIONS.md), so
// no self-referencing ordering issue in practice.
const TABLES_IN_ORDER = [
  "sync_runs",
  "sponsors",
  "snapshots",
  "staged_rows",
  "sponsor_routes",
  "sponsor_events",
  "sponsor_review_queue",
  "sponsor_links",
  "companies_house_cache",
  "daily_totals",
  "daily_breakdowns",
];

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const sourceUrl = process.env.DATABASE_URL;
  const targetUrl = process.env.AIVEN_DATABASE_URL_BY_IP;
  if (!sourceUrl) throw new Error("DATABASE_URL (source, Supabase) is not set.");
  if (!targetUrl) throw new Error("AIVEN_DATABASE_URL_BY_IP (target) is not set.");

  const source = postgres(sourceUrl, { prepare: false });
  const target = postgres(targetUrl, { prepare: false });

  try {
    // FK checks off for the duration of the copy - simplest way to load in any order without
    // fighting constraint timing, since every row is a straight copy from a DB that already
    // enforced these same constraints.
    await target.unsafe("SET session_replication_role = replica");

    for (const table of TABLES_IN_ORDER) {
      const [{ c: sourceCount }] = await source.unsafe(`select count(*)::int as c from ${table}`);
      if (sourceCount === 0) {
        console.log(`${table.padEnd(25)} 0 rows - skipping`);
        continue;
      }

      await target.unsafe(`TRUNCATE TABLE ${table} CASCADE`);

      let copied = 0;
      let lastId: string | null = null;
      const idColumn = table === "daily_totals" ? "date" : "id";

      while (true) {
        const rows: Record<string, unknown>[] = lastId
          ? await source.unsafe(
              `select * from ${table} where ${idColumn} > $1 order by ${idColumn} asc limit ${BATCH_SIZE}`,
              [lastId]
            )
          : await source.unsafe(`select * from ${table} order by ${idColumn} asc limit ${BATCH_SIZE}`);

        if (rows.length === 0) break;

        const columns = Object.keys(rows[0]);
        for (const batch of chunk(rows, 200)) {
          await target`INSERT INTO ${target(table)} ${target(batch, ...columns)}`;
        }

        copied += rows.length;
        lastId = String(rows[rows.length - 1][idColumn]);
        if (rows.length < BATCH_SIZE) break;
      }

      console.log(`${table.padEnd(25)} ${copied}/${sourceCount} rows copied`);
      if (copied !== sourceCount) {
        console.warn(`  WARNING: copied count does not match source count for ${table}`);
      }
    }

    await target.unsafe("SET session_replication_role = DEFAULT");

    // Explicit-id inserts don't advance serial/bigserial sequences - without this, the next
    // real INSERT (e.g. tomorrow's sync run) would try to reuse an id that already exists.
    const serialTables = [
      { table: "sync_runs", column: "id" },
      { table: "snapshots", column: "id" },
      { table: "staged_rows", column: "id" },
      { table: "sponsor_routes", column: "id" },
      { table: "sponsor_events", column: "id" },
      { table: "sponsor_review_queue", column: "id" },
      { table: "sponsor_links", column: "id" },
      { table: "companies_house_cache", column: "id" },
      { table: "daily_breakdowns", column: "id" },
    ];
    for (const { table, column } of serialTables) {
      await target.unsafe(
        `SELECT setval(pg_get_serial_sequence('${table}', '${column}'), COALESCE((SELECT MAX(${column}) FROM ${table}), 1))`
      );
    }
    console.log("Sequences reset to match copied data.");

    console.log("\nDone.");
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
