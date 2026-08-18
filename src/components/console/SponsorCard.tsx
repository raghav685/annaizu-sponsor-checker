import Link from "next/link";
import type { Sponsor } from "@/lib/types";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { RatingBadge, RoutePill, SponsorTypeTag } from "@/components/ui/Badges";

export function SponsorCard({ sponsor, compact }: { sponsor: Sponsor; compact: boolean }) {
  const visibleRoutes = sponsor.routes.slice(0, compact ? 1 : 2);
  const overflow = sponsor.routes.length - visibleRoutes.length;

  return (
    <Link href={`/sponsor/${sponsor.id}`} className="block h-full">
      <GlassPanel
        elevation="base"
        className={`h-full transition-all duration-200 hover:-translate-y-1 hover:border-signal/30 hover:shadow-[0_20px_50px_-20px_rgba(79,232,201,0.25)] ${
          compact ? "p-3" : "p-4"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className={`font-display text-mist ${compact ? "text-sm" : "text-base"} leading-snug`}>
            {sponsor.name}
          </h3>
          <RatingBadge rating={sponsor.rating} />
        </div>
        <p className={`mt-1 font-mono text-mist-dim ${compact ? "text-[11px]" : "text-xs"}`}>
          {sponsor.town}
          {sponsor.county ? `, ${sponsor.county}` : ""} · {sponsor.region}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {visibleRoutes.map((r) => (
            <RoutePill key={r} label={r} />
          ))}
          {overflow > 0 && <RoutePill label={`+${overflow}`} />}
        </div>
        {!compact && (
          <div className="mt-3">
            <SponsorTypeTag type={sponsor.sponsorType} />
          </div>
        )}
      </GlassPanel>
    </Link>
  );
}
