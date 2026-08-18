/**
 * CLI entry point for a manual sync. The actual logic lives in
 * src/lib/sync/runSync.ts, shared with the scheduled/manual API trigger so
 * there's exactly one code path for "what a sync does".
 */
import { runSync } from "../src/lib/sync/runSync";
import { checkAlerts } from "../src/lib/sync/alerts";

async function main() {
  console.log("[sync] Starting...");
  const outcome = await runSync();

  switch (outcome.status) {
    case "no_change":
      console.log(`[sync] No change since last sync (run #${outcome.runId}). Done.`);
      break;
    case "success":
      console.log(
        `[sync] Success (run #${outcome.runId}): active before ${outcome.sponsorsActiveBefore}, ` +
          `added ${outcome.sponsorsAddedCount}, removed ${outcome.sponsorsRemovedCount}, updated ${outcome.sponsorsUpdatedCount}.`
      );
      break;
    case "halted_for_review":
      console.warn(
        `[sync] HALTED FOR REVIEW (run #${outcome.runId}): removal ratio ${(outcome.removalRatio * 100).toFixed(2)}% ` +
          `(${outcome.sponsorsRemovedCount} sponsors). Live tables untouched.`
      );
      break;
    case "failed":
      console.error(`[sync] FAILED (run #${outcome.runId ?? "n/a"}): ${outcome.error}`);
      break;
  }

  const alerts = await checkAlerts();
  for (const a of alerts) console.warn(`[alert] ${a.message}`);

  return outcome.status === "failed" ? 1 : 0;
}

// Explicit exit: the PGlite/Neon connection has no automatic close and keeps
// the event loop alive indefinitely after the script's work is done - without
// this, a successful run prints its summary and then hangs forever instead
// of returning control to whatever invoked it (cron, CI, a human's shell).
main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
