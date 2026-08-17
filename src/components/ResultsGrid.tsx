"use client";

import type { Sponsor } from "@/types/sponsor";
import { SponsorCard } from "./SponsorCard";
import { SponsorCardSkeleton } from "./SponsorCardSkeleton";
import { Pagination } from "./Pagination";
import { Search } from "@/lib/icons";

export function ResultsGrid({
  sponsors,
  loading,
  error,
  page,
  totalPages,
  onPageChange,
  onSelect,
  onRetry,
}: {
  sponsors: Sponsor[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelect: (sponsor: Sponsor) => void;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface py-16 text-center">
        <p className="text-ink">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-[var(--radius-sm)] border border-border-strong px-4 py-2 text-sm font-medium text-ink hover:bg-surface-raised"
        >
          Try again
        </button>
      </div>
    );
  }

  if (loading && sponsors.length === 0) {
    return (
      <div aria-busy="true" aria-live="polite" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <span className="sr-only">Searching the register…</span>
        {Array.from({ length: 6 }).map((_, i) => (
          <SponsorCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!loading && sponsors.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface py-16 text-center">
        <Search className="size-6 text-ink-muted" aria-hidden="true" />
        <p className="font-display text-lg text-ink">No sponsors match those filters</p>
        <p className="prose-measure text-sm text-ink-muted">
          Try a broader search term, or clear a filter — the register covers over
          100,000 UK organisations, so most searches find something.
        </p>
        <p className="prose-measure text-sm text-ink-muted">
          Tip: the register lists each organisation&apos;s registered{" "}
          <strong>legal</strong> name, which can differ from its trading name —
          if you searched a brand name, try the legal entity name instead.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div
        aria-busy={loading}
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-[var(--duration-micro)] ${
          loading ? "opacity-60" : "opacity-100"
        }`}
      >
        {sponsors.map((sponsor) => (
          <SponsorCard key={sponsor.id} sponsor={sponsor} onSelect={onSelect} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
    </div>
  );
}
