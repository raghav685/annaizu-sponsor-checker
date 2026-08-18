import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMatchKey, similarity } from "../scripts/lib/matchKey";

test("buildMatchKey: case-insensitive", () => {
  assert.equal(buildMatchKey("Acme Ltd"), buildMatchKey("ACME LTD"));
});

test("buildMatchKey: strips legal suffixes (LTD, LIMITED, PLC, LLP, THE)", () => {
  const base = buildMatchKey("Acme Consulting");
  assert.equal(buildMatchKey("Acme Consulting Ltd"), base);
  assert.equal(buildMatchKey("Acme Consulting Limited"), base);
  assert.equal(buildMatchKey("Acme Consulting PLC"), base);
  assert.equal(buildMatchKey("Acme Consulting LLP"), base);
  assert.equal(buildMatchKey("The Acme Consulting"), base);
});

test("buildMatchKey: unifies & and 'and'", () => {
  assert.equal(buildMatchKey("J & B Holdings"), buildMatchKey("J and B Holdings"));
});

test("buildMatchKey: strips punctuation and collapses whitespace", () => {
  assert.equal(buildMatchKey("Acme,  Consulting.  Ltd"), buildMatchKey("Acme Consulting"));
  assert.equal(buildMatchKey("  Acme   Consulting  "), buildMatchKey("Acme Consulting"));
});

test("buildMatchKey: distinct organisations stay distinct", () => {
  assert.notEqual(buildMatchKey("Acme Consulting Ltd"), buildMatchKey("Acme Care Ltd"));
});

test("similarity: identical strings score 1", () => {
  assert.equal(similarity("ACME LTD", "ACME LTD"), 1);
});

test("similarity: a single-character typo scores high but not 1", () => {
  const score = similarity("ACME CONSULTING", "ACNE CONSULTING");
  assert.ok(score > 0.9 && score < 1, `expected a near-1 score for a 1-char typo, got ${score}`);
});

test("similarity: unrelated names score low", () => {
  const score = similarity("ACME CONSULTING", "ZEBRA LOGISTICS");
  assert.ok(score < 0.4, `expected a low score for unrelated names, got ${score}`);
});
