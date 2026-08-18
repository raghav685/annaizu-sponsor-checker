import { test } from "node:test";
import assert from "node:assert/strict";
import { matchSponsorToCompaniesHouse } from "../src/lib/companiesHouse/match";
import type { CachedLookup } from "../src/lib/companiesHouse/cache";

function lookup(overrides: Partial<CachedLookup> = {}): CachedLookup {
  return { matchedCompanyNumber: null, matchedCompanyName: null, companyStatus: null, sicCodes: null, fromCache: false, ...overrides };
}

test("matchSponsorToCompaniesHouse: a single confident variant match is accepted", async () => {
  const resolver = async () => lookup({ matchedCompanyNumber: "12345678", matchedCompanyName: "ACME CONSULTING LTD", companyStatus: "active" });
  const result = await matchSponsorToCompaniesHouse(["Acme Consulting Ltd"], resolver);
  assert.equal(result.divergent, false);
  assert.equal(result.bestMatch?.matchedCompanyNumber, "12345678");
  assert.ok(result.confidence > 0.8);
});

test("matchSponsorToCompaniesHouse: two variants confidently resolving to DIFFERENT companies is flagged divergent, never guessed", async () => {
  const responses: Record<string, CachedLookup> = {
    "Acme Consulting Ltd": lookup({ matchedCompanyNumber: "11111111", matchedCompanyName: "ACME CONSULTING LTD", companyStatus: "active" }),
    "Acme Consulting LLP": lookup({ matchedCompanyNumber: "22222222", matchedCompanyName: "ACME CONSULTING LLP", companyStatus: "active" }),
  };
  const resolver = async (name: string) => responses[name];
  const result = await matchSponsorToCompaniesHouse(["Acme Consulting Ltd", "Acme Consulting LLP"], resolver);
  assert.equal(result.divergent, true, "variants resolving to different company numbers must never be silently merged into one answer");
  assert.equal(result.bestMatch, null);
});

test("matchSponsorToCompaniesHouse: two variants resolving to the SAME company are not divergent", async () => {
  const same = lookup({ matchedCompanyNumber: "33333333", matchedCompanyName: "ACME CONSULTING LTD", companyStatus: "active" });
  const resolver = async () => same;
  const result = await matchSponsorToCompaniesHouse(["Acme Consulting Ltd", "ACME CONSULTING LIMITED"], resolver);
  assert.equal(result.divergent, false);
  assert.equal(result.bestMatch?.matchedCompanyNumber, "33333333");
});

test("matchSponsorToCompaniesHouse: a low-similarity search hit is not treated as a confident match", async () => {
  // Companies House search can return a top hit that isn't actually the org - a wrong
  // match that says a live company is closed is explicitly the worst outcome here.
  const resolver = async () => lookup({ matchedCompanyNumber: "44444444", matchedCompanyName: "COMPLETELY DIFFERENT BUSINESS LTD", companyStatus: "dissolved" });
  const result = await matchSponsorToCompaniesHouse(["Acme Consulting Ltd"], resolver);
  assert.equal(result.bestMatch, null, "a poor name match must not be accepted just because it's the only search hit");
  assert.equal(result.confidence, 0);
});

test("matchSponsorToCompaniesHouse: no search results at all resolves to unknown, not an error", async () => {
  const resolver = async () => lookup();
  const result = await matchSponsorToCompaniesHouse(["Some Obscure Sponsor Ltd"], resolver);
  assert.equal(result.bestMatch, null);
  assert.equal(result.divergent, false);
});
