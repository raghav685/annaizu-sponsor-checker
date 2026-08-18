"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RatingBadge } from "@/components/ui/Badges";
import { SponsorLinks } from "./SponsorLinks";
import type { Sponsor } from "@/lib/types";

export const TABLE_GRID_COLUMNS = "2.2fr 1fr 1.3fr 1fr 0.9fr 0.9fr 0.9fr";
const HEADER_CELLS = ["Organisation", "Location", "Industry", "Tier", "Status", "Links", "Added"];

function formatAdded(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function SponsorTableHeader() {
  return (
    <div
      className="grid shrink-0 gap-2 border-b border-hairline-strong px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-wide text-mist-dim/70"
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
      className="grid cursor-pointer items-center gap-2 border-b border-hairline px-4 transition-colors hover:bg-white/[0.03]"
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
        {isActive ? "Active" : "Revoked"}
      </span>
      <SponsorLinks name={sponsor.name} />
      <span className="whitespace-nowrap text-right font-mono text-xs text-mist-dim">{formatAdded(sponsor.firstSeenAt)}</span>
    </div>
  );
}
