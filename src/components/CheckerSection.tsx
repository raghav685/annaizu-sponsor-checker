"use client";

import { useState } from "react";
import type { Sponsor } from "@/types/sponsor";
import { useSponsorSearchContext } from "@/context/SponsorSearchContext";
import { SearchFilters } from "./SearchFilters";
import { ResultsGrid } from "./ResultsGrid";
import { SponsorDetail } from "./SponsorDetail";

export function CheckerSection() {
  const {
    filters,
    updateFilters,
    removeFilterValue,
    clearFilters,
    activeFilterCount,
    page,
    setPage,
    result,
    loading,
    error,
    retry,
    facets,
  } = useSponsorSearchContext();
  const [selected, setSelected] = useState<Sponsor | null>(null);

  const resultLabel = result
    ? `${result.total.toLocaleString()} sponsor${result.total === 1 ? "" : "s"} found`
    : "Searching…";

  return (
    <section id="checker" className="mx-auto w-full max-w-[var(--container-max)] px-5 md:px-8">
      <h2 className="mb-4 text-xl font-medium text-ink">Search the register</h2>

      <SearchFilters
        filters={filters}
        facets={facets}
        onChange={updateFilters}
        onRemoveValue={removeFilterValue}
        onClear={clearFilters}
        activeFilterCount={activeFilterCount}
        resultLabel={resultLabel}
      />

      <div className="mt-6">
        <ResultsGrid
          sponsors={result?.sponsors ?? []}
          loading={loading}
          error={error}
          page={page}
          totalPages={result?.totalPages ?? 1}
          onPageChange={setPage}
          onSelect={setSelected}
          onRetry={retry}
        />
      </div>

      <SponsorDetail sponsor={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
