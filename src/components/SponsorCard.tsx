"use client";

import type { Sponsor } from "@/types/sponsor";
import { RatingBadge } from "./RatingBadge";
import { MapPin } from "@/lib/icons";

export function SponsorCard({
  sponsor,
  onSelect,
}: {
  sponsor: Sponsor;
  onSelect: (sponsor: Sponsor) => void;
}) {
  const visibleRoutes = sponsor.routes.slice(0, 2);
  const extraRoutes = sponsor.routes.length - visibleRoutes.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(sponsor)}
      className="group flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-surface-raised p-5 text-left transition-[transform,box-shadow,border-color] duration-[var(--duration-micro)] ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_8px_24px_-12px_rgb(0_0_0_/_0.18)] focus-visible:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          title={sponsor.organisationName}
          className="min-w-0 truncate font-display text-lg font-medium leading-snug text-ink"
        >
          {sponsor.organisationName}
        </h3>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-ink-muted">
        <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
        <span>
          {sponsor.townCity}
          {sponsor.county ? `, ${sponsor.county}` : ""}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {sponsor.ratingTiers.map((tier) => (
          <RatingBadge key={tier} tier={tier} />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
        {visibleRoutes.map((route) => (
          <span
            key={route}
            className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-muted"
          >
            {route}
          </span>
        ))}
        {extraRoutes > 0 && (
          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-muted">
            +{extraRoutes} more
          </span>
        )}
      </div>

      <span className="mt-1 text-sm font-medium text-brand opacity-0 transition-opacity duration-[var(--duration-micro)] group-hover:opacity-100 group-focus-visible:opacity-100">
        View details →
      </span>
    </button>
  );
}
