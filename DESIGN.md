# Design

## Overview

Annaizu is a product-led checker tool over UK government sponsor data. The visual
language borrows Swiss/editorial discipline — a strict grid, restrained neutral
surfaces, one confident brand accent — rather than the generic govtech look
(dated bureaucratic blue, cramped tables, heavy borders) or generic SaaS-cute
(rounded pastel cards, gradient text, badge walls). Motion is layered on top with
databest.webflow.io-level polish, but always in service of comprehension: reveal
on scroll, respond on hover, count up once, then get out of the way.

Color strategy: **Restrained**. Neutral ink/paper surfaces carry the page; one
brand accent (indigo-violet) is spent deliberately on primary actions, links,
focus rings, and hero accents. Rating colors are semantic, not decorative — they
appear only on rating badges and are never reused as brand color.

## Color Palette (OKLCH)

All tokens are swappable in `src/app/globals.css` under `@theme`. To rebrand,
change `--color-brand*` only — every other token is neutral or semantic.

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `oklch(0.99 0.002 260)` | Page background |
| `--color-surface` | `oklch(0.97 0.004 260)` | Recessed sections, input fills |
| `--color-surface-raised` | `oklch(1 0 0)` | Cards, modal, popovers |
| `--color-ink` | `oklch(0.19 0.01 260)` | Primary text, headings |
| `--color-ink-muted` | `oklch(0.44 0.015 260)` | Secondary text (≥4.5:1 on bg/surface) |
| `--color-border` | `oklch(0.89 0.006 260)` | Hairlines, dividers |
| `--color-border-strong` | `oklch(0.8 0.008 260)` | Input borders, focus-adjacent |
| `--color-brand` | `oklch(0.47 0.17 276)` | Primary buttons, links, active nav, brand mark |
| `--color-brand-strong` | `oklch(0.38 0.18 276)` | Hover/pressed brand states |
| `--color-brand-soft` | `oklch(0.95 0.025 276)` | Tinted brand backgrounds (hero accent, active filter chip) |
| `--color-on-brand` | `oklch(0.99 0.01 276)` | Text/icons on brand fill |
| `--color-rating-a` | `oklch(0.5 0.14 152)` | A-rating badge (incl. Premium/SME+) |
| `--color-rating-a-soft` | `oklch(0.94 0.045 152)` | A-rating badge background |
| `--color-rating-b` | `oklch(0.47 0.13 55)` | B-rating badge |
| `--color-rating-b-soft` | `oklch(0.94 0.05 65)` | B-rating badge background |
| `--color-rating-provisional` | `oklch(0.48 0.02 260)` | Provisional/UK Expansion Worker badge |
| `--color-rating-provisional-soft` | `oklch(0.93 0.006 260)` | Provisional badge background |
| `--color-destructive` | `oklch(0.55 0.19 25)` | Errors, empty-state failure |

Dark mode mirrors the same roles at inverted lightness (see `globals.css`); it
follows the OS `prefers-color-scheme`, matching the Next.js scaffold default.

## Typography

**Space Grotesk** (display/headings) + **Inter** (body/UI/data). Contrast axis:
Space Grotesk's slightly technical, squared-off character gives headlines and
the hero counter presence without tipping into editorial-serif "law firm" or
rounded-geometric "SaaS-cute" territory; Inter carries every dense, small-size
surface (search results, filter labels, badges) where legibility matters most.
Tabular figures (`font-variant-numeric: tabular-nums`) on the sponsor counter
and any numeric badge so digits don't shift width while animating.

- Display / H1: Space Grotesk, 600, `clamp(2.25rem, 4vw + 1rem, 3.75rem)`, tracking -0.02em
- H2: Space Grotesk, 600, `clamp(1.75rem, 2vw + 1rem, 2.5rem)`
- H3 / card titles: Space Grotesk, 500, 1.25rem
- Body: Inter, 400, 1rem, line-height 1.6
- Small / meta / badges: Inter, 500, 0.8125rem
- Body measure capped at 68ch in prose sections (educational/FAQ copy)

## Layout & Spacing

8px base spacing scale (`--space-1` = 4px … `--space-16` = 64px). Max content
width `--container-max: 80rem` with `--container-gutter` scaling from 1.25rem
(mobile) to 3rem (desktop). Result grid: `repeat(auto-fit, minmax(280px, 1fr))`
— no fixed breakpoint math needed for the card grid.

Radius scale: `--radius-sm: 8px` (badges, inputs) / `--radius-md: 12px` (cards)
/ `--radius-lg: 20px` (modal/slide-over). Not fully sharp (would read as
brutalist and less approachable for an anxious visa applicant), not fully
soft/pill (would read as consumer-SaaS).

Shadow is reserved for true elevation only — dropdowns, the sponsor detail
modal, sticky filter bar on scroll — never as decoration on flat result cards.

## Components (contract, not full spec)

- **Search bar**: full-width, `radius-md`, `surface-raised` fill, brand-colored
  focus ring, icon-left, live result count announced via `aria-live="polite"`.
- **Filter controls**: native `<select>`/popover-based, never absolutely
  positioned inside an `overflow:hidden` ancestor (portal or `position: fixed`
  for the panel). Active filters surface as dismissible chips.
- **Sponsor card**: org name (Space Grotesk, truncate with full name on
  hover/focus, never silently cut with no recovery), location, rating badge(s),
  route badge(s). No nested cards. Whole card is the hit target, keyboard
  reachable, opens detail on Enter/click.
- **Rating badge**: semantic color pair from the table above, icon + text
  (never color alone) — e.g. checkmark for A, caution glyph for B.
  Badges follow the icon system in `src/lib/icons.ts` (Lucide).
- **Detail slide-over**: slides from the right on desktop, from the bottom on
  mobile; scrim 45% `--color-ink`; closes on Escape/scrim click/explicit close
  button; focus is trapped and returns to the triggering card on close.

## Motion

- Timing tokens: `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` for entrances,
  `--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1)` for hover/press. No bounce,
  no elastic, anywhere.
- Durations: micro (hover/press) 150–200ms; reveals 400–600ms; hero counter
  1200–1600ms.
- Scroll reveals: fade + 16px translate-y, staggered 40ms per card/list item.
- Hover: cards lift 2–4px with a soft shadow and a subtle magnetic pull toward
  the cursor on pointer-capable devices only; buttons scale 0.98 on press.
- Every animation ships a `prefers-reduced-motion` fallback: instant/crossfade,
  no translate, no scroll-driven pinning.

## Anti-patterns to avoid here specifically

- No gradient text, no glassmorphism-as-decoration, no side-stripe borders on
  cards, no tiny uppercase eyebrow above every section, no 01/02/03 numbered
  section markers (nothing here is a real sequence), no bureaucratic table
  styling for results (cards/rows with generous whitespace instead).
