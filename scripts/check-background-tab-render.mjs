#!/usr/bin/env node
/**
 * Regression test: the home page must render real, correctly-sized,
 * interactive content immediately — even if the tab was opened in the
 * background (cmd-click, restored session, switching apps while it loads)
 * and never gets a requestAnimationFrame tick until the user switches to it.
 *
 * This guards against a real bug we hit: the page used to defer its entire
 * content behind a streamed React Suspense boundary (because a client hook
 * called `useSearchParams()`), and that boundary's client-side reveal timed
 * itself off a `requestAnimationFrame` callback. Browsers suspend rAF for
 * backgrounded tabs, so the reveal — and therefore the whole page — never
 * happened until the tab was foregrounded. See src/hooks/useSponsorSearch.ts
 * for the fix (useSyncExternalStore instead of useSearchParams).
 *
 * Simulating a real OS-backgrounded tab isn't reliable in a headless/CI
 * browser (tab-focus switching doesn't flip `document.visibilityState` the
 * way it does in a real windowed browser — verified empirically, in both
 * headless and headed launch modes, in this environment). Instead this test
 * directly reproduces the precise failure condition a backgrounded tab
 * causes — requestAnimationFrame never firing — by neutering rAF before any
 * page script runs, which is a stronger and fully deterministic guarantee:
 * if the page renders and is interactive with rAF permanently unavailable,
 * it cannot be depending on an rAF-timed reveal, under any circumstance.
 *
 * Usage: node scripts/check-background-tab-render.mjs
 * Requires the dev/prod server already running at TEST_URL (default
 * http://localhost:3000/).
 */
import { chromium } from "playwright";

const URL = process.env.TEST_URL ?? "http://localhost:3000/";
const BACKGROUND_WAIT_MS = 10_000;

async function assertContentRenderedAndInteractive(page, label) {
  const headerBox = await page.locator("header").boundingBox();
  if (!headerBox || headerBox.width === 0 || headerBox.height === 0) {
    throw new Error(`[${label}] Header has zero layout size: ${JSON.stringify(headerBox)}`);
  }

  const contentfulHiddenElements = await page.evaluate(
    () => document.querySelectorAll("[hidden]:not(:empty)").length,
  );
  if (contentfulHiddenElements > 0) {
    throw new Error(
      `[${label}] Found ${contentfulHiddenElements} non-empty [hidden] element(s) — real content may be trapped behind a deferred reveal`,
    );
  }

  const searchLink = page.getByRole("link", { name: /search now/i });
  const linkBox = await searchLink.boundingBox();
  if (!linkBox || linkBox.width === 0 || linkBox.height === 0) {
    throw new Error(`[${label}] "Search now" link not found or has zero size: ${JSON.stringify(linkBox)}`);
  }

  await page.mouse.move(linkBox.x + linkBox.width / 2, linkBox.y + linkBox.height / 2);
  const hoverState = await searchLink.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const topElement = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return { matchesHover: el.matches(":hover"), isTopElement: topElement === el };
  });

  if (!hoverState.matchesHover || !hoverState.isTopElement) {
    throw new Error(`[${label}] Hover did not apply to the real link element: ${JSON.stringify(hoverState)}`);
  }
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Phase 1: "backgrounded" tab — rAF is neutered before any page script
  // runs, and never restored for the lifetime of this page, exactly as
  // Chromium suspends rAF for the lifetime of a real backgrounded tab.
  const bgPage = await context.newPage();
  await bgPage.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
    window.cancelAnimationFrame = () => {};
  });
  await bgPage.goto(URL, { waitUntil: "domcontentloaded" });

  console.log(`rAF disabled (simulating a backgrounded tab). Waiting ${BACKGROUND_WAIT_MS / 1000}s...`);
  await bgPage.waitForTimeout(BACKGROUND_WAIT_MS);

  await assertContentRenderedAndInteractive(bgPage, "while backgrounded, rAF never fired");
  console.log('PASS: content is sized and interactive with rAF permanently disabled ("backgrounded").');
  await bgPage.close();

  // Phase 2: a fresh, unmodified page — the normal "foregrounded" case,
  // confirming the fix doesn't regress ordinary behavior either.
  const fgPage = await context.newPage();
  await fgPage.goto(URL, { waitUntil: "domcontentloaded" });
  await fgPage.waitForTimeout(500);

  await assertContentRenderedAndInteractive(fgPage, "normal foregrounded tab");
  console.log("PASS: content is sized and interactive on a normal foregrounded tab.");
  await fgPage.close();

  await browser.close();
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exitCode = 1;
});
