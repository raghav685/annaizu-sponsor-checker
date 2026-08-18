# Decisions Log

Recording ambiguity resolutions per the project brief's instruction to "choose the
option that keeps the data honest and the interface calm."

## Skills substitution
The brief names `/mnt/skills/public/frontend-design/SKILL.md`, `/mnt/skills/public/xlsx/SKILL.md`,
`/mnt/skills/public/pdf/SKILL.md`, `/mnt/skills/public/docx/SKILL.md`. Those paths don't exist in
this CLI environment (they're a claude.ai Projects convention). Substituted:
- Design pass: the `design-taste-frontend` skill (closest anti-slop / token-system equivalent).
  Note its own scope statement explicitly excludes "dashboards / dense product UI" - so its rules
  are applied to Story mode in full, and to Console mode only where they don't conflict with
  instrument-panel/data-density conventions.
- Charts: the `dataviz` skill, read before building the Recharts panel.
- CSV parsing: no xlsx skill available; followed the brief's own Papaparse instructions directly
  (case-insensitive/fuzzy header matching, defensive parsing) since no dedicated skill exists here.
- Export current view: implemented as CSV (Papaparse.unparse), which the brief marks as the
  required format ("XLSX and a PDF summary" are called out as optional). Skipped XLSX/PDF
  export given the scope of everything else in this brief - CSV opens fine in Excel/Sheets
  and covers the mandatory case honestly rather than half-building two more exporters.

## Sidebar vs top-bar search consolidation
The brief lists "Search within results (organisation name)" as the sidebar's first filter
AND a separate large primary search bar in the console top bar with its own spec (fuzzy,
debounced, ⌘K, suggestion dropdown). Implemented as ONE shared search input (the top-bar
one, with ⌘K/`/` focus, debounce, fuzzy Fuse.js matching, suggestion dropdown) feeding the
same `filters.search` state, rather than building two redundant name-search boxes that would
fight each other. The sidebar does not duplicate a second search field.

## Signature element geography
"a slowly rotating wireframe UK landmass" - built as a hand-authored simplified coastline
outline (Great Britain + Northern Ireland, low-poly line loops) in an equirectangular-ish
projection, with real per-town sponsor-count-sized nodes placed via approximate town
lat/long. This is deliberately a stylised/simplified outline, not a survey-grade GeoJSON
coastline - it reads as "the UK" at hero scale while keeping the Three.js scene lightweight.

## Existing repo
Found a prior in-progress build at this same path (`annaizu-sponsor-checker`, Framer-Motion based,
partially matching the old brief). Per user confirmation: committed it as a checkpoint
(`ce8d475`) before wiping, so it's fully recoverable via `git log` / `git show`, then wiped per
the ground rules.

## Next.js version
Repo previously had Next.js 16.3.1 installed. Brief pins "Next.js 15" explicitly under "use exactly
this" stack. Scaffolding with `create-next-app@15` to honor the literal spec.

## Local DB / build concurrency
`next build` crashed PGlite (`RuntimeError: Aborted()`) when generating the sitemap: PGlite is a
single-process embedded DB (like SQLite), and Next's default multi-worker static generation opens
several concurrent connections to the same `.pglite-data` file. Fixed with `experimental.cpus: 1`
in `next.config.ts` - only affects local builds against the PGlite fallback; production Neon is a
real multi-connection server and hits this from neither the app nor the build.

## Sponsor identity: composite (match_key, town), not match_key alone
Running the real register through the pipeline surfaced ~1,024 genuine multi-branch organisations
sharing an identical name across towns, and ~484 raw spelling/casing/suffix variants of the same
org in the same town. Manually audited all ~473 merge groups the parser produces (categorised:
206 pure cosmetic, 260 differ only by legal suffix, 7 "suspicious" that turned out to also be
`&` vs `and` variants on closer inspection) - zero false-positive merges found. Full detail in
`docs/data-pipeline.md`.

## Outstanding commitment: wording for any "removed" tile / the changelog UI
Because the natural key is `(match_key, town)`, BOTH a rename AND a relocation are structurally
identical to a genuine licence loss under Phase 1's diff (a `removed`+`added` pair) - relocation
is not a separate, rarer case than rename, it's the same limitation. This stops being an internal
caveat the moment it's a number on the homepage. Binding wording constraints for whatever ships
this, once built (no such UI exists yet):
- Any user-facing tile built from `sponsorsRemovedCount` / the `removed` event type must be
  worded as **observed register movement**, never "licence loss" or "revoked" - under-claim
  rather than let a rebrand or office move read as someone's employer losing its sponsor licence.
- The Register changelog page must carry a **visible note** (not buried in a tooltip or footnote)
  that until Phase 2 ships, removals may include renames and relocations alongside genuine
  licence losses.
Not yet done because no KPI tile or changelog page exists yet - tracked here so the wording isn't
decided ad hoc when one finally gets built.

## HARD PREREQUISITE: a snapshot-replay tool is required before ever changing buildMatchKey()
Confirmed with the user that rebuilding sponsor identity from stored snapshots is possible in
principle (pure functions over raw CSV text + DB state), but no such replay tool is built yet.
Per explicit instruction: **do not modify `buildMatchKey()`'s normalisation rule without first
building the replay tool** - changing the matching rule without a way to rebuild from the
`snapshots` archive would silently fragment or re-merge sponsor identities with no way back.

## KPI tiles / history charts: no withdrawn/closed split until Companies House lands
Per explicit instruction: any KPI strip built before Companies House integration ships must show
a single "removed from register" figure, not a withdrawn/closed split (we can't tell them apart
yet). Any time-series/history chart must render only the range actually held, labelled "history
begins <date>" - never interpolated or synthetic. No such UI exists yet as of this note; this is
a constraint on whatever builds it next (Companies House phase + the KPI-strip/analytics pages).
