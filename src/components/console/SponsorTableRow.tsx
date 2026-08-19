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
export function SponsorTableRow({ sponsor, height }: { sponsor: Sponsor; height: number }) {
  const router = useRouter();
  const isActive = sponsor.status === "active";
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
      <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${isActive ? "text-signal" : "text-mist-dim"}`}>
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-signal" : "bg-mist-dim"}`} />
        {isActive ? "Active" : "Removed"}
      </span>
      <SponsorLinks />
      <span className="whitespace-nowrap text-right font-mono text-xs text-mist-dim">{formatAdded(sponsor.firstSeenAt)}</span>
    </div>
  );
}
