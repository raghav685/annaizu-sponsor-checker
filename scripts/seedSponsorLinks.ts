/**
 * One-off (and re-runnable) loader for verified sponsor website/LinkedIn links.
 *
 * Takes a directory of `results-*.json` files (each an array of
 * `{ id, website, linkedin }`, matched by sponsor UUID) produced by a manual
 * research pass, and upserts them onto `sponsors`. Every row gets
 * `linksCheckedAt` stamped regardless of outcome - including a confident
 * "no match found" - so a future automated queue (mirroring
 * src/lib/companiesHouse/processQueue.ts) knows not to re-check it before
 * RECHECK_AFTER_DAYS, exactly like the Companies House queue's own pattern.
 *
 * Usage: npx tsx scripts/seedSponsorLinks.ts <directory-of-results-json> [source-tag]
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, describeDbTarget } from "../src/db/client";
import { sponsors } from "../src/db/schema";

interface ResultRow {
  id: string;
  website: string | null;
  linkedin: string | null;
}

function isPlausibleUrl(u: string | null): u is string {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

async function main() {
  const dir = process.argv[2];
  const sourceTag = process.argv[3] ?? "manual_seed_2026_08";
  if (!dir) {
    console.error("Usage: npx tsx scripts/seedSponsorLinks.ts <directory-of-results-json> [source-tag]");
    process.exit(1);
  }

  console.log(`[seed-links] Target: ${describeDbTarget()}`);

  const files = readdirSync(dir).filter((f) => f.startsWith("results-") && f.endsWith(".json"));
  if (files.length === 0) {
    console.error(`[seed-links] No results-*.json files found in ${dir}`);
    process.exit(1);
  }

  const rows: ResultRow[] = [];
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(path.join(dir, file), "utf-8")) as ResultRow[];
    rows.push(...parsed);
  }
  console.log(`[seed-links] Loaded ${rows.length} rows from ${files.length} files.`);

  let websiteCount = 0;
  let linkedinCount = 0;
  let bothNullCount = 0;
  let rejectedBadUrl = 0;

  const now = new Date();
  for (const row of rows) {
    const website = isPlausibleUrl(row.website) ? row.website : null;
    const linkedin = isPlausibleUrl(row.linkedin) ? row.linkedin : null;
    if (row.website && !website) rejectedBadUrl++;
    if (row.linkedin && !linkedin) rejectedBadUrl++;
    if (website) websiteCount++;
    if (linkedin) linkedinCount++;
    if (!website && !linkedin) bothNullCount++;

    await db
      .update(sponsors)
      .set({ website, linkedin, linksCheckedAt: now, linksSource: sourceTag })
      .where(eq(sponsors.id, row.id));
  }

  console.log(
    `[seed-links] Done. ${rows.length} sponsors processed: ${websiteCount} got a website, ${linkedinCount} got a linkedin, ` +
      `${bothNullCount} had neither (now stamped as checked, won't be re-picked immediately), ${rejectedBadUrl} malformed URLs rejected.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed-links] Failed:", err);
    process.exit(1);
  });
