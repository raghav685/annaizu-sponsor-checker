"use client";

import { useId, useRef, useState } from "react";
import type { SponsorFilters } from "@/hooks/useSponsorSearch";
import type { Facets } from "@/hooks/useFacets";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { Search, SlidersHorizontal, X, ChevronDown } from "@/lib/icons";

function CheckboxGroup({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
  };

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1 text-sm text-ink-muted hover:bg-surface"
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggle(option)}
              className="size-4 rounded border-border-strong accent-[var(--color-brand)]"
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SearchFilters({
  filters,
  facets,
  onChange,
  onRemoveValue,
  onClear,
  activeFilterCount,
  resultLabel,
}: {
  filters: SponsorFilters;
  facets: Facets | null;
  onChange: (patch: Partial<SponsorFilters>) => void;
  onRemoveValue: (key: "types" | "ratingTiers" | "routes", value: string) => void;
  onClear: () => void;
  activeFilterCount: number;
  resultLabel: string;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useClickOutside(panelRef, () => setPanelOpen(false), panelOpen);
  useFocusTrap(panelRef, panelOpen, () => setPanelOpen(false));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            inputMode="search"
            value={filters.q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Search by organisation name…"
            aria-label="Search by organisation name"
            className="h-14 w-full rounded-[var(--radius-md)] border border-border bg-surface-raised pl-11 pr-4 text-base text-ink placeholder:text-ink-muted focus-visible:border-brand"
          />
        </div>

        <input
          type="text"
          value={filters.townCity}
          onChange={(e) => onChange({ townCity: e.target.value })}
          placeholder="Town or city"
          aria-label="Filter by town or city"
          list="town-city-options"
          className="h-14 w-full rounded-[var(--radius-md)] border border-border bg-surface-raised px-4 text-base text-ink placeholder:text-ink-muted focus-visible:border-brand md:w-48"
        />
        <datalist id="town-city-options">
          {facets?.townCities.slice(0, 500).map((city) => <option key={city} value={city} />)}
        </datalist>

        <div ref={panelRef} className="relative">
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            aria-expanded={panelOpen}
            aria-controls={panelId}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-raised px-4 text-base font-medium text-ink hover:border-border-strong md:w-auto"
          >
            <SlidersHorizontal className="size-5" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-brand text-xs font-semibold text-on-brand">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`size-4 transition-transform duration-[var(--duration-micro)] ${panelOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {panelOpen && (
            <div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Filter sponsors"
              className="absolute right-0 z-20 mt-2 w-[min(90vw,22rem)] rounded-[var(--radius-md)] border border-border bg-surface-raised p-4 shadow-[0_16px_40px_-16px_rgb(0_0_0_/_0.25)]"
            >
              <div className="flex flex-col gap-5">
                <CheckboxGroup
                  legend="Sponsor rating"
                  options={facets?.ratingTiers ?? []}
                  selected={filters.ratingTiers}
                  onChange={(v) => onChange({ ratingTiers: v })}
                />
                <CheckboxGroup
                  legend="Visa route"
                  options={facets?.routes ?? []}
                  selected={filters.routes}
                  onChange={(v) => onChange({ routes: v })}
                />
                <input
                  type="text"
                  value={filters.county}
                  onChange={(e) => onChange({ county: e.target.value })}
                  placeholder="County"
                  aria-label="Filter by county"
                  className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-sm text-ink placeholder:text-ink-muted focus-visible:border-brand"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <ActiveFilterChips
        filters={filters}
        onRemoveValue={onRemoveValue}
        onRemoveField={(field) => onChange({ [field]: "" })}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="tabular text-sm text-ink-muted">
          {resultLabel}
        </p>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
