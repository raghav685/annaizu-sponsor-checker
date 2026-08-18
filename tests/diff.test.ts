import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDiff, identityKey, type CurrentSponsorState, type StagedSponsorGroup } from "../scripts/lib/diff";

function sponsor(overrides: Partial<CurrentSponsorState> = {}): CurrentSponsorState {
  return {
    id: "id-1",
    matchKey: "ACME CONSULTING",
    displayName: "Acme Consulting Ltd",
    town: "London",
    county: "",
    region: "London",
    sector: "Other",
    status: "active",
    nameVariants: ["Acme Consulting Ltd"],
    routes: [{ route: "Skilled Worker", rating: "A", sponsorType: "Worker" }],
    ...overrides,
  };
}

function staged(overrides: Partial<StagedSponsorGroup> = {}): StagedSponsorGroup {
  return {
    matchKey: "ACME CONSULTING",
    displayName: "Acme Consulting Ltd",
    town: "London",
    county: "",
    region: "London",
    sector: "Other",
    nameVariants: ["Acme Consulting Ltd"],
    routes: [{ route: "Skilled Worker", rating: "A", sponsorType: "Worker" }],
    ...overrides,
  };
}

test("computeDiff: baseline load emits one 'added' event per founding sponsor, nothing else", () => {
  const result = computeDiff([], [staged(), staged({ matchKey: "ZEBRA LOGISTICS", town: "Leeds" })]);
  assert.equal(result.sponsorsAddedCount, 2);
  assert.equal(result.sponsorsRemovedCount, 0);
  assert.equal(result.sponsorsActiveBefore, 0);
  assert.equal(result.events.length, 2);
  assert.ok(result.events.every((e) => e.eventType === "added"));
});

test("computeDiff: re-running on unchanged data produces zero events (idempotency)", () => {
  const current = [sponsor()];
  const stagedData = [staged()];
  const result = computeDiff(current, stagedData);
  assert.equal(result.events.length, 0, "no events should fire when nothing changed");
  assert.equal(result.sponsorsAddedCount, 0);
  assert.equal(result.sponsorsRemovedCount, 0);
  assert.equal(result.sponsorsUpdatedCount, 0);
});

test("computeDiff: an unchanged sponsor produces no write at all (not even a no-op update)", () => {
  // This is the whole cost of a "changed publish" on ~127k sponsors: skipping
  // a no-op write for every unchanged sponsor is what keeps a daily sync's
  // cost proportional to the real delta instead of the full register size.
  const current = [sponsor()];
  const result = computeDiff(current, [staged()]);
  assert.equal(result.sponsorUpserts.length, 0, "no DB write should be queued for an unchanged sponsor");
});

test("computeDiff: a casing/county drift on an otherwise-unchanged sponsor still writes an update", () => {
  const current = [sponsor()];
  const result = computeDiff(current, [staged({ county: "Greater London" })]);
  assert.equal(result.sponsorUpserts.length, 1);
  assert.equal(result.sponsorUpserts[0].action, "update");
});

test("computeDiff: cosmetic-only drift (county/region/sector/name-casing) does NOT count toward sponsorsUpdatedCount", () => {
  // sponsorsUpdatedCount feeds a user-facing KPI tile ("records updated in the
  // latest publish") - it must reflect substantive change (route/rating), not
  // Home Office text-formatting noise, or the tile becomes meaningless.
  const current = [sponsor()];
  const result = computeDiff(current, [
    staged({ county: "Greater London", region: "South East", sector: "Retail", displayName: "Acme Consulting Limited" }),
  ]);
  assert.equal(result.sponsorUpserts.length, 1, "the record itself should still be refreshed");
  assert.equal(result.sponsorsUpdatedCount, 0, "cosmetic drift alone must not increment the updated-count KPI");
});

test("computeDiff: a real route/rating change DOES count toward sponsorsUpdatedCount", () => {
  const current = [sponsor()];
  const result = computeDiff(current, [staged({ routes: [{ route: "Skilled Worker", rating: "B", sponsorType: "Worker" }] })]);
  assert.equal(result.sponsorsUpdatedCount, 1);
});

test("computeDiff: name variants accumulate across runs rather than being overwritten", () => {
  const current = [sponsor({ nameVariants: ["Acme Consulting Ltd"] })];
  const result = computeDiff(current, [staged({ nameVariants: ["ACME CONSULTING LIMITED"], county: "Greater London" })]);
  assert.deepEqual(result.sponsorUpserts[0].nameVariants.sort(), ["ACME CONSULTING LIMITED", "Acme Consulting Ltd"].sort());
});

test("computeDiff: a sponsor missing from the staged data is a plain removal", () => {
  const current = [sponsor()];
  const result = computeDiff(current, []);
  assert.equal(result.sponsorsRemovedCount, 1);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].eventType, "removed");
  assert.equal(result.sponsorUpserts[0].action, "remove");
  assert.equal(result.removalRatio, 1);
});

test("computeDiff: a previously-removed sponsor reappearing is matched by identity, not re-inserted", () => {
  const current = [sponsor({ status: "unknown", routes: [] })];
  const result = computeDiff(current, [staged()]);
  assert.equal(result.sponsorsAddedCount, 1);
  assert.equal(result.events[0].eventType, "added");
  assert.equal(result.events[0].notes, "reappeared after previous removal");
  assert.equal(result.sponsorUpserts[0].action, "reactivate", "must reactivate the existing row, never insert a new one");
});

test("computeDiff: route added on a continuing sponsor", () => {
  const current = [sponsor()];
  const withExtraRoute = staged({
    routes: [
      { route: "Skilled Worker", rating: "A", sponsorType: "Worker" },
      { route: "Charity Worker", rating: "A", sponsorType: "Temporary Worker" },
    ],
  });
  const result = computeDiff(current, [withExtraRoute]);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].eventType, "route_added");
  assert.equal(result.events[0].route, "Charity Worker");
  assert.equal(result.sponsorsUpdatedCount, 1);
});

test("computeDiff: route removed on a continuing sponsor", () => {
  const current = [sponsor({ routes: [{ route: "Skilled Worker", rating: "A", sponsorType: "Worker" }, { route: "Charity Worker", rating: "A", sponsorType: "Temporary Worker" }] })];
  const result = computeDiff(current, [staged()]); // only Skilled Worker remains
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].eventType, "route_removed");
  assert.equal(result.events[0].route, "Charity Worker");
});

test("computeDiff: rating change on an existing route", () => {
  const current = [sponsor()];
  const result = computeDiff(current, [staged({ routes: [{ route: "Skilled Worker", rating: "B", sponsorType: "Worker" }] })]);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].eventType, "rating_changed");
  assert.deepEqual(result.events[0].before, { rating: "A" });
  assert.deepEqual(result.events[0].after, { rating: "B" });
});

test("computeDiff: identical name in different towns (multi-branch) are independent - removing one leaves the other untouched", () => {
  const current = [
    sponsor({ id: "id-london", town: "London" }),
    sponsor({ id: "id-ilford", town: "Ilford" }),
  ];
  // Only the London branch survives in this publish.
  const result = computeDiff(current, [staged({ town: "London" })]);
  assert.equal(result.sponsorsRemovedCount, 1);
  assert.equal(result.sponsorsAddedCount, 0);
  const removedEvent = result.events.find((e) => e.eventType === "removed");
  assert.equal(removedEvent?.identityKey, identityKey("ACME CONSULTING", "Ilford"));
});

test("computeDiff: removal ratio is undefined-safe when there were no active sponsors before", () => {
  const result = computeDiff([], [staged()]);
  assert.equal(result.removalRatio, 0);
});

test("computeDiff: removal ratio reflects sponsor-level counts, not raw route-row churn", () => {
  // 10 active sponsors, one loses a route (not removed) - ratio must be 0, not skewed by route churn.
  const current = Array.from({ length: 10 }, (_, i) =>
    sponsor({ id: `id-${i}`, matchKey: `SPONSOR ${i}`, routes: [{ route: "Skilled Worker", rating: "A", sponsorType: "Worker" }, { route: "Charity Worker", rating: "A", sponsorType: "Temporary Worker" }] })
  );
  const stagedData = current.map((c, i) =>
    staged({ matchKey: c.matchKey, routes: i === 0 ? [{ route: "Skilled Worker", rating: "A", sponsorType: "Worker" }] : c.routes })
  );
  const result = computeDiff(current, stagedData);
  assert.equal(result.sponsorsRemovedCount, 0);
  assert.equal(result.removalRatio, 0);
});
