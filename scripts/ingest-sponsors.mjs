#!/usr/bin/env node
/**
 * Ingests the UK Home Office "Register of Licensed Sponsors" into data/sponsors.json.
 *
 * Live source: the gov.uk publication page below links to a CSV whose filename/hash
 * changes on every publish, so we scrape the page first to find the current link
 * rather than hardcoding a URL.
 *
 * Usage: node scripts/ingest-sponsors.mjs
 * Falls back to data/sponsors.sample.json (checked into the repo) if the live
 * fetch fails — e.g. no network access in a sandboxed/CI environment.
 */
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT_PATH = path.join(DATA_DIR, "sponsors.json");
const SAMPLE_FALLBACK_PATH = path.join(DATA_DIR, "sponsors.sample.json");

const PUBLICATION_URL =
  "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers";

// TODO(annaizu): this ingestion currently runs on-demand (`npm run ingest`).
// For a production deployment, wire this into a daily cron / scheduled job
// (e.g. Vercel Cron hitting an API route that re-runs this logic) so the
// dataset tracks the Home Office's near-daily publishing cadence automatically.

async function findCurrentCsvUrl() {
  const res = await fetch(PUBLICATION_URL, {
    headers: { "user-agent": "Mozilla/5.0 (Annaizu sponsor-licence-checker ingestion script)" },
  });
  if (!res.ok) throw new Error(`Failed to load publication page: HTTP ${res.status}`);
  const html = await res.text();
  const match = html.match(
    /https:\/\/assets\.publishing\.service\.gov\.uk\/media\/[^"'\s]+?\.csv/i
  );
  if (!match) throw new Error("Could not locate a .csv link on the publication page");
  return match[0];
}

function normaliseWhitespace(value) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** "Worker (A rating)" -> { type: "Worker", ratingTier: "A rating" } */
function parseTypeAndRating(raw) {
  const value = normaliseWhitespace(raw);
  const match = value.match(/^(Worker|Temporary Worker)\s*\((.+)\)$/i);
  if (!match) return { type: "Worker", ratingTier: value || "A rating" };
  const type = /temporary/i.test(match[1]) ? "Temporary Worker" : "Worker";
  let ratingTier = normaliseWhitespace(match[2]);
  if (/premium/i.test(ratingTier)) ratingTier = "A rating (Premium)";
  else if (/sme\+?/i.test(ratingTier)) ratingTier = "A rating (SME+)";
  else if (/^a/i.test(ratingTier)) ratingTier = "A rating";
  else if (/^b/i.test(ratingTier)) ratingTier = "B rating";
  else if (/expansion/i.test(ratingTier)) ratingTier = "UK Expansion Worker: Provisional";
  return { type, ratingTier };
}

function slugify(value) {
  return normaliseWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildDataset(rows, sourceUrl) {
  const sponsorsByKey = new Map();

  for (const row of rows) {
    const organisationName = normaliseWhitespace(row["Organisation Name"]);
    const townCity = normaliseWhitespace(row["Town/City"]);
    const countyRaw = normaliseWhitespace(row["County"]);
    const county = countyRaw.length > 0 ? countyRaw : null;
    const route = normaliseWhitespace(row["Route"]);
    const { type, ratingTier } = parseTypeAndRating(row["Type & Rating"]);
    if (!organisationName) continue;

    const key = `${organisationName.toLowerCase()}|${townCity.toLowerCase()}|${(county ?? "").toLowerCase()}`;
    let sponsor = sponsorsByKey.get(key);
    if (!sponsor) {
      sponsor = {
        id: "",
        organisationName,
        townCity,
        county,
        ratings: new Set(),
        types: new Set(),
        ratingTiers: new Set(),
        routes: new Set(),
      };
      sponsorsByKey.set(key, sponsor);
    }
    sponsor.ratings.add(normaliseWhitespace(row["Type & Rating"]));
    sponsor.types.add(type);
    sponsor.ratingTiers.add(ratingTier);
    if (route) sponsor.routes.add(route);
  }

  const counties = new Set();
  const townCities = new Set();
  const routes = new Set();
  const ratingTiers = new Set();
  const types = new Set();

  const sponsors = Array.from(sponsorsByKey.values())
    .map((s) => {
      if (s.county) counties.add(s.county);
      townCities.add(s.townCity);
      s.routes.forEach((r) => routes.add(r));
      s.ratingTiers.forEach((r) => ratingTiers.add(r));
      s.types.forEach((t) => types.add(t));
      return {
        id: slugify(`${s.organisationName}-${s.townCity}-${s.county ?? ""}`) || slugify(s.organisationName),
        organisationName: s.organisationName,
        townCity: s.townCity,
        county: s.county,
        ratings: Array.from(s.ratings).sort(),
        types: Array.from(s.types).sort(),
        ratingTiers: Array.from(s.ratingTiers).sort(),
        routes: Array.from(s.routes).sort(),
      };
    })
    .sort((a, b) => a.organisationName.localeCompare(b.organisationName));

  // De-duplicate ids (rare collisions after slugifying distinct orgs identically)
  const seenIds = new Map();
  for (const sponsor of sponsors) {
    const count = seenIds.get(sponsor.id) ?? 0;
    seenIds.set(sponsor.id, count + 1);
    if (count > 0) sponsor.id = `${sponsor.id}-${count}`;
  }

  return {
    generatedAt: undefined,
    sourceUrl,
    sourcePublicationUrl: PUBLICATION_URL,
    totalSponsors: sponsors.length,
    totalRows: rows.length,
    counties: Array.from(counties).sort(),
    townCities: Array.from(townCities).sort(),
    routes: Array.from(routes).sort(),
    ratingTiers: Array.from(ratingTiers).sort(),
    types: Array.from(types).sort(),
    sponsors,
  };
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  let csvText;
  let sourceUrl;
  try {
    sourceUrl = await findCurrentCsvUrl();
    console.log(`Found live CSV: ${sourceUrl}`);
    const csvRes = await fetch(sourceUrl);
    if (!csvRes.ok) throw new Error(`CSV fetch failed: HTTP ${csvRes.status}`);
    csvText = await csvRes.text();
    console.log(`Downloaded ${(csvText.length / 1024 / 1024).toFixed(1)} MB`);
  } catch (err) {
    console.warn(`Live ingestion failed (${err.message}).`);
    if (existsSync(SAMPLE_FALLBACK_PATH)) {
      console.warn(`Falling back to bundled sample dataset: ${SAMPLE_FALLBACK_PATH}`);
      await writeFile(OUTPUT_PATH, await readFile(SAMPLE_FALLBACK_PATH));
      return;
    }
    throw err;
  }

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors?.length) {
    console.warn(`CSV parse warnings: ${parsed.errors.length} (showing first 3)`);
    console.warn(parsed.errors.slice(0, 3));
  }

  const dataset = buildDataset(parsed.data, sourceUrl);
  dataset.generatedAt = new Date().toISOString();

  await writeFile(OUTPUT_PATH, JSON.stringify(dataset));
  console.log(
    `Wrote ${OUTPUT_PATH} — ${dataset.totalSponsors} sponsors from ${dataset.totalRows} rows`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
