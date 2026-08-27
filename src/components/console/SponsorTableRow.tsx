"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RatingBadge } from "@/components/ui/Badges";
import { SponsorLinks } from "./SponsorLinks";
import type { Sponsor } from "@/lib/types";

// Tier/Status/Links are badges/icons that never need much room - most of the
// width goes to Organisation/Location/Industry, which is where names were
// truncating to 3-4 characters before this was widened.
export const TABLE_GRID_COLUMNS = "2.6fr 1.1fr 1.3fr 0.55fr 0.85fr 0.75fr 0.85fr";
export const ROW_HEIGHTS = { compact: 48, comfortable: 60 } as const;
// A fixed floor on the table's width, independent of the fr ratios above -
// otherwise a narrow viewport (sidebar + filters + charts panel all open at
// once) squeezes every column proportionally, and organisation names go back
// to truncating no matter how generous their own fr share is. Below this
// width the table scrolls horizontally instead of compressing further.
export const TABLE_MIN_WIDTH_CLASS = "w-full min-w-[960px]";
// Below `md`, a 960px-wide grid means the table is a horizontal-scroll strip - almost
// nothing readable fits in one screen width. SponsorCard below is the same data,
// same click/hover/link behavior, laid out for a single column instead.
export const CARD_HEIGHT = 88;
const HEADER_CELLS = ["Organisation", "Location", "Industry", "Tier", "Status", "Links", "Added"];

function formatAdded(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function SponsorTableHeader() {
  return (
    <div
      className={`grid shrink-0 gap-3 border-b border-hairline-strong px-5 py-3 font-mono text-[10.5px] uppercase tracking-wide text-mist-dim/70 ${TABLE_MIN_WIDTH_CLASS}`}
      style={{ gridTemplateColumns: TABLE_GRID_COLUMNS }}
    >
      {HEADER_CELLS.map((h) => (
        <span key={h} className={h === "Added" ? "text-right" : ""}>
          {h}
        </span>
      ))}
    </div>
  );
}

// A <Link> can't contain other <a> elements - nested anchors are invalid HTML, and browsers
// resolve the resulting malformed DOM inconsistently (which is exactly what made the website
// and LinkedIn icons both seem to open the same destination). The row itself is a plain div
// that navigates on click; only the organisation name and the link icons are real anchors,
// as siblings rather than nested inside one another.
// See ConsoleShell.tsx's STATUS_TABS comment - neither "suspended" nor "revoked" is a status
// GOV.UK actually supplies.
const STATUS_LABEL: Record<Sponsor["status"], string> = {
  active: "Active",
  suspended: "Revoked",
  revoked: "Suspended",
};

const STATUS_COLOR: Record<Sponsor["status"], string> = {
  active: "text-signal",
  suspended: "text-ember",
  revoked: "text-mist-dim",
};
const STATUS_DOT_COLOR: Record<Sponsor["status"], string> = {
  active: "bg-signal",
  suspended: "bg-ember",
  revoked: "bg-mist-dim",
};

/** Native-tooltip summary of a sponsor's Companies House match, if any - deliberately not a
 *  new column/layout element (see docs/data-pipeline.md Companies House phase): the existing
 *  Status cell just gets a small superscript marker for suspended/revoked rows that have one. */
function companiesHouseTooltip(sponsor: Sponsor): string | null {
  const ch = sponsor.companiesHouse;
  if (!ch) return null;
  if (ch.needsReview) return "Companies House: multiple plausible company matches found - flagged for manual review, not auto-attached.";
  if (!ch.number) {
    const pct = ch.matchConfidence !== null ? `${Math.round(ch.matchConfidence * 100)}%` : "unknown";
    return `Companies House: no confident match found (best candidate ${pct} similarity).`;
  }
  const parts = [`Companies House: ${ch.number}`];
  if (ch.companyType) parts.push(ch.companyType);
  if (ch.incorporatedAt) parts.push(`incorporated ${new Date(ch.incorporatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`);
  if (ch.registeredOffice) parts.push(ch.registeredOffice);
  if (ch.matchConfidence !== null) parts.push(`${Math.round(ch.matchConfidence * 100)}% match confidence`);
  return parts.join(" · ");
}

function CompaniesHouseMarker({ sponsor }: { sponsor: Sponsor }) {
  const tooltip = companiesHouseTooltip(sponsor);
  if (!tooltip) return null;
  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className="ml-0.5 inline-flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-white/15 font-mono text-[9px] leading-none text-mist-dim"
    >
      i
    </span>
  );
}

export function SponsorTableRow({ sponsor, height }: { sponsor: Sponsor; height: number }) {
  const router = useRouter();
  const href = `/sponsor/${sponsor.id}`;

  return (
    <div
      role="row"
      tabIndex={-1}
      onClick={() => router.push(href)}
      style={{ height, gridTemplateColumns: TABLE_GRID_COLUMNS }}
      className={`grid cursor-pointer items-center gap-3 border-b border-hairline px-5 transition-colors hover:bg-white/[0.05] ${TABLE_MIN_WIDTH_CLASS}`}
    >
      <Link href={href} onClick={(e) => e.stopPropagation()} className="truncate font-display text-sm text-mist hover:underline focus-visible:underline">
        {sponsor.name}
      </Link>
      <span className="truncate font-mono text-xs text-mist-dim">{sponsor.town}</span>
      <span className="truncate">
        <span className="inline-flex max-w-full items-center truncate rounded-md bg-ember/[0.12] px-2 py-0.5 font-mono text-[10.5px] text-ember">
          {sponsor.sector}
        </span>
      </span>
      <span>
        <RatingBadge rating={sponsor.rating} />
      </span>
      <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${STATUS_COLOR[sponsor.status]}`}>
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLOR[sponsor.status]}`} />
        {STATUS_LABEL[sponsor.status]}
        <CompaniesHouseMarker sponsor={sponsor} />
      </span>
      <SponsorLinks />
      <span className="whitespace-nowrap text-right font-mono text-xs text-mist-dim">{formatAdded(sponsor.firstSeenAt)}</span>
    </div>
  );
}

// Same data, same click-to-navigate, same link/hover behavior as SponsorTableRow -
// just laid out as one column of stacked lines instead of a 7-column grid, since
// that grid has nothing to compress into below ~960px of width.
export function SponsorCard({ sponsor, height }: { sponsor: Sponsor; height: number }) {
  const router = useRouter();
  const href = `/sponsor/${sponsor.id}`;

  return (
    <div
      role="row"
      tabIndex={-1}
      onClick={() => router.push(href)}
      style={{ height }}
      className="flex w-full flex-col justify-center gap-1.5 border-b border-hairline px-4 py-3 cursor-pointer transition-colors hover:bg-white/[0.05]"
    >
      <div className="flex items-center justify-between gap-3">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 truncate font-display text-sm text-mist hover:underline focus-visible:underline"
        >
          {sponsor.name}
        </Link>
        <RatingBadge rating={sponsor.rating} />
      </div>
      <div className="flex items-center gap-2 font-mono text-xs text-mist-dim">
        <span className="truncate">{sponsor.town}</span>
        <span aria-hidden>·</span>
        <span className="inline-flex shrink-0 items-center truncate rounded-md bg-ember/[0.12] px-2 py-0.5 text-[10.5px] text-ember">
          {sponsor.sector}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${STATUS_COLOR[sponsor.status]}`}>
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLOR[sponsor.status]}`} />
          {STATUS_LABEL[sponsor.status]}
          <CompaniesHouseMarker sponsor={sponsor} />
        </span>
        <div className="flex items-center gap-3">
          <SponsorLinks />
          <span className="whitespace-nowrap font-mono text-xs text-mist-dim">{formatAdded(sponsor.firstSeenAt)}</span>
        </div>
      </div>
    </div>
  );
}
