"use client";

import type { SponsorFilters } from "@/hooks/useSponsorSearch";
import { X } from "@/lib/icons";

type ChipKey = "types" | "ratingTiers" | "routes";

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand-strong">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="rounded-full p-0.5 hover:bg-brand/10"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

export function ActiveFilterChips({
  filters,
  onRemoveValue,
  onRemoveField,
}: {
  filters: SponsorFilters;
  onRemoveValue: (key: ChipKey, value: string) => void;
  onRemoveField: (field: "townCity" | "county") => void;
}) {
  const hasChips =
    filters.types.length > 0 ||
    filters.ratingTiers.length > 0 ||
    filters.routes.length > 0 ||
    filters.townCity !== "" ||
    filters.county !== "";

  if (!hasChips) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Active filters">
      {filters.ratingTiers.map((tier) => (
        <Chip key={`rating-${tier}`} label={tier} onRemove={() => onRemoveValue("ratingTiers", tier)} />
      ))}
      {filters.routes.map((route) => (
        <Chip key={`route-${route}`} label={route} onRemove={() => onRemoveValue("routes", route)} />
      ))}
      {filters.townCity && (
        <Chip label={`Town/city: ${filters.townCity}`} onRemove={() => onRemoveField("townCity")} />
      )}
      {filters.county && (
        <Chip label={`County: ${filters.county}`} onRemove={() => onRemoveField("county")} />
      )}
    </div>
  );
}
