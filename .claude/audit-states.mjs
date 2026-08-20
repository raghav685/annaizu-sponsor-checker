// Custom page-state setup for the responsive-breakpoints audit's --script hook.
// Selected via AUDIT_STATE env var; run once per width, after navigation and
// before the audit's own --wait timeout and measurement probe.
//
// Longest sponsor name (140 chars) found via a one-off query against
// /api/data/sponsors: "Charity For Roman Catholic Purposes Administered In
// Connection With The English Province Of The Community Of The Religious Of
// Jesus And Mary". Fuse's fuzzy matching can't find this via the full 140-char
// string (or even a 46-char substring) as a search query - it returns zero
// results, apparently bounded by Fuse's default `distance` option. A shorter,
// still-unique substring works and reliably surfaces it as one of 11 matches.
const LONGEST_NAME = "Roman Catholic Purposes";

async function waitForRegisterLoaded(page, timeout = 40000) {
  await page.waitForFunction(() => !document.body.innerText.includes("loading register"), undefined, { timeout });
}

async function setSearch(page, value) {
  const input = await page.waitForSelector('input[aria-label="Search sponsor organisations"]', { timeout: 10000 });
  await input.fill(value);
  // Filtering runs through the worker - give it a moment to come back.
  await page.waitForTimeout(1500);
}

const STATES = {
  // Highest-risk state per the plan: the drawer is now genuinely position:fixed
  // (Stage 2) and was never measured open before.
  async "drawer-open"(page) {
    // The setup script runs immediately after page.goto resolves - before React
    // has necessarily hydrated. A click that lands before hydration hits the
    // DOM but not React's onClick, and silently does nothing.
    await page.waitForTimeout(1200);
    const openBtn = await page.$('[aria-label="Open filters"]');
    if (openBtn) {
      await openBtn.click();
      await page.waitForTimeout(400); // let the 300ms transform transition settle
    }
  },

  async "search-results"(page) {
    await waitForRegisterLoaded(page);
    await setSearch(page, "care");
  },

  async "search-empty"(page) {
    await waitForRegisterLoaded(page);
    await setSearch(page, "zzznonexistentsponsorxyz123");
  },

  async "longest-name"(page) {
    await waitForRegisterLoaded(page);
    await setSearch(page, LONGEST_NAME);
  },

  async "zoom200"(page) {
    // Chromium's CSS `zoom` property scales rendered output but does NOT
    // shift what @media queries see as the viewport width - real browser
    // zoom (Ctrl/Cmd+) shifts both together, so `zoom` alone produces a
    // false mismatch (e.g. xl: still active while rendering is halved) that
    // a real 200%-zoomed user would never see. Resizing the viewport itself
    // to width/2 is the standard WCAG 1.4.10 technique and correctly shifts
    // breakpoint evaluation along with the effective rendering size.
    const vp = page.viewportSize();
    if (vp) await page.setViewportSize({ width: Math.round(vp.width / 2), height: Math.round(vp.height / 2) });
  },
};

async function setupState(page) {
  const state = process.env.AUDIT_STATE;
  const fn = STATES[state];
  if (!fn) throw new Error(`Unknown AUDIT_STATE "${state}" - expected one of: ${Object.keys(STATES).join(", ")}`);
  await fn(page);
}

export default setupState;
