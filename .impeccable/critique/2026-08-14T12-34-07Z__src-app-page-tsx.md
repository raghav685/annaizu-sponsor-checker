---
target: homepage (src/app/page.tsx)
total_score: 24
p0_count: 0
p1_count: 4
timestamp: 2026-08-14T12-34-07Z
slug: src-app-page-tsx
---
Method: dual-agent (Assessment A: design review · Assessment B: detector + browser evidence), run as two isolated sub-agents.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Live search dims to `opacity-60` on refetch, but there's no persistent in-flight indicator once results already exist. |
| 2 | Match Between System and Real World | 3 | Jargon (rating tiers, routes) is well translated in Education/FAQ, but that translation is screens away from the badges that actually use the jargon. |
| 3 | User Control and Freedom | 2 | Filters/search text live only in React state — never synced to the URL. Refresh, back, or sharing a link silently wipes them. |
| 4 | Consistency and Standards | 2 | Two visually distinct inputs bound to the same `filters.q` field with different placeholder copy; two overlay widgets with different close contracts (Escape works on one, not the other). |
| 5 | Error Prevention | 3 | Low intrinsic risk (read-only search), little to prevent, nothing found that actively breaks. |
| 6 | Recognition Rather Than Recall | 2 | DESIGN.md specs dismissible filter chips; the shipped UI only shows a numeric count badge — selected filters aren't visible without reopening the popover. |
| 7 | Flexibility and Efficiency of Use | 2 | No keyboard shortcuts, no deep-linkable search state, no page-size/density control. |
| 8 | Aesthetic and Minimalist Design | 3 | Visually restrained on its own terms, but the marketing-grade motion layer sits oddly against the "product" register this project declared itself to be. |
| 9 | Error Recovery | 1 | Fetch failure shows one static sentence, no retry action, no distinction between network/server failure. |
| 10 | Help and Documentation | 3 | Education/FAQ content is genuinely good and plain-language, but nothing is contextual — no link from a confusing badge straight to its explanation. |
| **Total** | | **24/40** | **Acceptable — significant improvements needed before users are happy** |

## Anti-Patterns Verdict

**LLM assessment**: Not generic AI slop — the OKLCH token system, restrained neutral surfaces, explicit anti-pattern list, and genuinely-implemented `prefers-reduced-motion` fallbacks all read as real intent. But there's a real **register mismatch**: `PRODUCT.md` declares this project's register as `product`, and the skill's own `reference/product.md` explicitly bans "display fonts in UI labels, buttons, data" and "decorative motion that doesn't convey state" — yet `SponsorCard.tsx` renders organisation *data* in the display font, and the homepage opens with a marketing hero (fluid clamp H1, staggered reveal, infinite marquee, magnetically-attracted CTA, 1.4s count-up). Notably, `DESIGN.md` itself *prescribes* exactly what `reference/product.md` bans — the project's own two governing docs disagree on the register's core rule. This is the single most consequential finding, and it's a call to make, not a clear-cut bug (see "Register mismatch" note below).

**Deterministic scan**: `detect.mjs --json src` → exit 0, zero static findings. Sanity-checked as a genuine clean result (not a broken detector) by firing it against a synthetic bad file, which correctly triggered.

**Browser evidence**: Live injection succeeded and surfaced **9 real anti-patterns**, all verified against source:
- `skipped-heading` ×1 — the page's only `<h1>` (Hero) is followed by `<h3>` (`SponsorCard` org names) with no `<h2>` in between; the first real `<h2>` doesn't appear until `EducationSection`, well after search results render.
- `line-length` ×7 — every FAQ answer paragraph (`FAQSection.tsx`) renders ~86 real characters/line despite a 68ch CSS cap, because Inter at `text-sm` packs more real characters per `ch` unit than the cap assumes.
- `overused-font` ×2 — Space Grotesk 15% / Inter 85% split, flagged by the detector's heuristic. This one reads as a probable false-positive-in-spirit: it's a deliberate, `DESIGN.md`-specified two-font pairing (headings vs. everything else), not accidental font sprawl — the detector likely can't distinguish the two.

## Overall Impression

The build is genuinely well-crafted at the component level — tokens, motion restraint, accessibility fallbacks are all real, not decorative. The gap is between the polished marketing shell and the actual task tool underneath it: several places where the UI doesn't yet behave like the fast, no-friction lookup tool `PRODUCT.md` promises (state lost on refresh, selected filters invisible once chosen, a duplicated search field that disorients on focus). The single biggest opportunity is closing that gap — not by stripping the polish, but by making the actual checker loop (search → filter → detail) as tight and recoverable as the surrounding design already looks.

## What's Working

1. **Reduced-motion handling is real, not performative** — every animated component branches to a genuinely static fallback, backed by a global CSS failsafe.
2. **`RatingBadge` correctly pairs icon + color + text**, never relying on color alone — matches both WCAG guidance and the project's own written spec.
3. **The empty state teaches rather than dead-ends** — explains why (100k+ orgs, most searches succeed) and suggests a next step.

## Priority Issues

**[P1] Selected filters are invisible once the popover closes**
- **Why it matters**: `DESIGN.md` itself specs "active filters surface as dismissible chips." The shipped `SearchFilters.tsx` only shows a numeric badge count — a user who picked "B rating" + "Skilled Worker" has no way to see or remove one filter without reopening the whole popover.
- **Fix**: Render selected rating/route/county values as individual dismissible chips beneath the search row.
- **Suggested command**: `/impeccable clarify`

**[P1] Filter/search state isn't in the URL — refresh or a shared link silently wipes it**
- **Why it matters**: `useSponsorSearch.ts` builds a query string only for the internal fetch call, never pushes it to the address bar. A time-pressured user who refreshes, hits back, or wants to send someone the exact search loses everything with no warning.
- **Fix**: Sync `filters` + `page` to the URL query string.
- **Suggested command**: `/impeccable harden`

**[P1] The hero search input scrolls the page away from itself on focus, and duplicates the real search field under different copy**
- **Why it matters**: Focusing the hero input auto-scrolls to the checker section while focus stays pinned to the now off-screen input — disorienting, especially for a first-time, anxious user. The two inputs are the same bound field with different placeholder copy, reading as two different features.
- **Fix**: Either drop the redundant hero input (scroll/link instead of duplicating the control) or keep focus and scroll together predictably, and unify the copy.
- **Suggested command**: `/impeccable clarify`

**[P1] Heading hierarchy skips from `<h1>` straight to `<h3>`**
- **Why it matters**: Confirmed independently by source review and the live detector — no `<h2>` exists before `SponsorCard`'s `<h3>` org names render. Screen-reader users navigating by heading level lose the page's structure at exactly the point the results appear.
- **Fix**: Add a heading (visible or `sr-only`) at the appropriate level before the results grid.
- **Suggested command**: `/impeccable harden`

**[P2] The sponsor detail panel doesn't trap or restore focus, despite its own spec requiring it**
- **Why it matters**: `DESIGN.md` explicitly contracts "focus is trapped and returns to the triggering card on close." The shipped panel sets initial focus and listens for Escape, but Tab can escape into the background, and focus never returns to the triggering card — at exactly the moment (viewing the actual verification result) that matters most.
- **Fix**: Trap Tab within the dialog while open, mark background content inert, refocus the originating card on close.
- **Suggested command**: `/impeccable harden`

## Register mismatch — a decision, not a bug

`PRODUCT.md`'s register is `product`, but the built hero (fluid headline, marquee, magnetic CTA, animated counter) and the `DESIGN.md` spec that governs it (display font on card titles, clamp-sized headings) both lean toward the `brand` register's playbook — which is what the original brief actually asked for (databest.webflow.io-level motion, hero/counter/marquee). This tension is real and was flagged independently by both the source-code review and by comparing `DESIGN.md` against the skill's own `reference/product.md` rules. It's not something to silently "fix" — it's worth an explicit call on which register should actually govern the hero/marketing shell vs. the checker tool itself.

## Persona Red Flags

**Jordan (Confused First-Timer)** — closest match to the primary "unfamiliar with immigration terminology" user:
- The hero search box scrolls the page away mid-focus with no warning.
- "A rating (SME+)" and "UK Expansion Worker: Provisional" appear on badges with zero inline explanation — the plain-English translation is several screens below in Education/FAQ.
- The 10-item visa-route checkbox list is unexplained jargon presented as a flat wall of choices with no definitions at the point of decision.

**Sam (Accessibility-Dependent User)**:
- Sponsor detail dialog has no real focus trap and doesn't restore focus on close.
- The filter popover uses `role="dialog"` without `aria-modal`, a focus trap, or Escape-to-close — inconsistent with the sponsor detail modal's better (if still incomplete) contract.
- The route checkbox list sits in a small internal scroll box with no visible scroll affordance beyond the browser default.

**Priya, The Anxious Applicant** *(derived from PRODUCT.md's primary user)*: mid-application, checking her employer's *trading* name against a deadline. If her first search (trading name) comes back empty, the generic empty-state copy never surfaces the single most likely cause — that the register lists *legal* names, which `FAQSection.tsx` explains, but only in a collapsed accordion she may never open. Combined with the URL-state gap, she also has no way to save or share the specific result she found.

## Minor Observations

- `SponsorCard.tsx`'s org-name heading has no `truncate`/`line-clamp`, despite `DESIGN.md`'s card contract calling for it — long legal entity names will produce uneven card heights across a grid row.
- Loading state uses opacity-dim + spinner rather than skeleton cards — `reference/product.md` calls for skeletons over mid-content spinners.
- FAQ answer paragraphs run ~86 real characters/line despite the 68ch cap (see browser evidence above) — worth tightening `.prose-measure` or narrowing FAQ answers specifically.
- The filter popover's click-outside handler re-registers a fresh listener on every internal click rather than using one stable outside-click hook — harmless but fragile.
- "Updated {date}" appears in two different date formats between Hero and Footer for the same fact.
- `RouteMarquee` is correctly `aria-hidden`, but scrolls the exact same route names that are live filter checkboxes elsewhere — a missed chance to make it double as a shortcut.
- The fetch-failure message has no retry action.
- The `overused-font` detector flag is likely not a real problem given the deliberate two-font pairing — flagging as a judgment call, not a mandated fix.

## Questions to Consider

- Does the marketing hero (badge pill, animated counter, infinite marquee, magnetic button) serve the "find and understand a sponsor's status within seconds" purpose, or does it trade time-to-first-result for trust-performance with the exact time-pressured user `PRODUCT.md` describes?
- If the register refreshes every few days, would stamping each individual sponsor result with its own "verified as of" close the trust gap faster than the disclaimer paragraph at the bottom of the detail panel currently does?
- What would a confident version of the empty state do differently — name the likely reason (legal vs. trading name) right there, instead of leaving it for the FAQ to explain?
