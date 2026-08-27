"use client";

import { useExplorerStore } from "@/lib/store";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { TABLE_MIN_WIDTH_CLASS, SponsorTableHeader, SponsorTableRow, SponsorCard } from "./SponsorTableRow";
import { EmptyState } from "./EmptyState";
import { SkeletonGrid } from "./SkeletonGrid";
import { PaginationBar } from "./PaginationBar";

const CARD_BREAKPOINT = "(max-width: 767px)";

export function ResultsGrid() {
  const result = useExplorerStore((s) => s.result);
  const density = useExplorerStore((s) => s.filters.density);
  const isLoading = useExplorerStore((s) => s.isLoading);
  const page = useExplorerStore((s) => s.page);
  const setPage = useExplorerStore((s) => s.setPage);
  const isCardMode = useMediaQuery(CARD_BREAKPOINT);

  if (isLoading && result.rows.length === 0) return <SkeletonGrid density={density} isCardMode={isCardMode} />;
  if (!isLoading && result.rows.length === 0) return <EmptyState />;

  return (
    <GlassPanel elevation="base" className="flex h-full flex-col overflow-hidden">
      {/* One shared horizontal scroller for header + body, so columns never drift out of
          alignment - only the body underneath scrolls vertically on its own. */}
      <div className={`flex min-h-0 flex-1 flex-col ${isCardMode ? "" : "overflow-x-auto"}`}>
        {!isCardMode && <SponsorTableHeader />}
        <div
          className={`min-h-0 flex-1 overflow-y-auto ${isCardMode ? "w-full" : TABLE_MIN_WIDTH_CLASS}`}
          role="grid"
          aria-label="Sponsor results"
          aria-busy={isLoading}
        >
          {result.rows.map((sponsor) =>
            isCardMode ? (
              <SponsorCard key={sponsor.id} sponsor={sponsor} height={88} />
            ) : (
              <SponsorTableRow key={sponsor.id} sponsor={sponsor} height={density === "compact" ? 48 : 60} />
            )
          )}
        </div>
      </div>
      <PaginationBar page={page} pageCount={result.pageCount} pageSize={result.pageSize} total={result.total} onPageChange={setPage} />
    </GlassPanel>
  );
}
