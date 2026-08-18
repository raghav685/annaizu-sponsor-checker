import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseRegisterCsv } from "../scripts/lib/parseRegister";

const fixture = readFileSync(path.join(__dirname, "fixtures/sample-register.csv"), "utf-8");

test("parseRegisterCsv: skips blank organisation rows and reports the count", () => {
  const result = parseRegisterCsv(fixture);
  assert.equal(result.skippedBlankOrg, 1);
});

test("parseRegisterCsv: maps headers by name and fails loudly on a missing column", () => {
  const badCsv = "Org Name,Town\nAcme,London\n";
  assert.throws(() => parseRegisterCsv(badCsv), /Expected a column matching/);
});

test("parseRegisterCsv: collapses multiple routes for the same sponsor into one entity", () => {
  const { sponsors } = parseRegisterCsv(fixture);
  const acme = sponsors.find((s) => s.matchKey === "ACME CONSULTING");
  assert.ok(acme, "Acme Consulting should be parsed");
  assert.equal(acme!.routes.length, 2);
  assert.deepEqual(
    acme!.routes.map((r) => r.route).sort(),
    ["Global Business Mobility: Senior or Specialist Worker", "Skilled Worker"]
  );
});

test("parseRegisterCsv: keeps identically-named sponsors in different towns as separate entities", () => {
  const { sponsors } = parseRegisterCsv(fixture);
  const cabs = sponsors.filter((s) => s.matchKey === "1ST CHOICE CABS");
  assert.equal(cabs.length, 2, "multi-branch operators must not be merged across towns");
  assert.deepEqual(
    cabs.map((s) => s.town).sort(),
    ["Ilford", "London"]
  );
});

test("parseRegisterCsv: merges raw spelling/casing/suffix variants of the same org in the same town", () => {
  const { sponsors } = parseRegisterCsv(fixture);
  const aab = sponsors.filter((s) => s.matchKey === "AAB BUSINESS AND TAX ADVISORY");
  assert.equal(aab.length, 1, "casing/whitespace/legal-suffix variants in the same town must merge");
  assert.equal(aab[0].routes.length, 2);
});

test("parseRegisterCsv: records every raw name variant that was merged, so a merge is inspectable/reversible", () => {
  const { sponsors } = parseRegisterCsv(fixture);
  const aab = sponsors.find((s) => s.matchKey === "AAB BUSINESS AND TAX ADVISORY");
  assert.ok(aab);
  assert.deepEqual(
    aab!.nameVariants.map((v) => v.trim()).sort(),
    ["AAB Business And Tax Advisory", "AAB BUSINESS AND TAX ADVISORY LLP"].sort()
  );
});

test("parseRegisterCsv: preserves rating per-route, not just per-sponsor", () => {
  const { sponsors } = parseRegisterCsv(fixture);
  const riverside = sponsors.find((s) => s.matchKey === "RIVERSIDE CARE HOMES");
  assert.ok(riverside);
  assert.equal(riverside!.routes[0].rating, "B");
});

test("parseRegisterCsv: parses Temporary Worker sponsor type and carries county through", () => {
  const { sponsors } = parseRegisterCsv(fixture);
  const sunrise = sponsors.find((s) => s.matchKey === "SUNRISE KITCHEN T A SUNRISE CAFE" || s.displayName.includes("Sunrise"));
  assert.ok(sunrise, "Sunrise Kitchen should be parsed");
  assert.equal(sunrise!.county, "Lancashire");
  assert.equal(sunrise!.routes[0].sponsorType, "Temporary Worker");
});

test("parseRegisterCsv: normalises & to AND in the match key", () => {
  const { sponsors } = parseRegisterCsv(fixture);
  const jb = sponsors.find((s) => s.displayName.includes("J & B"));
  assert.ok(jb);
  assert.equal(jb!.matchKey, "J AND B HOLDINGS");
});
