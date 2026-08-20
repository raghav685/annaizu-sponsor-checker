"use client";

import { useCallback, useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useExplorerStore } from "@/lib/store";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ROW_HEIGHTS, CARD_HEIGHT, TABLE_MIN_WIDTH_CLASS, SponsorTableHeader, SponsorTableRow, SponsorCard } from "./SponsorTableRow";
import { EmptyState } from "./EmptyState";
import { SkeletonGrid } from "./SkeletonGrid";

// Below `md` the 7-column grid has nothing left to compress into (see
// TABLE_MIN_WIDTH_CLASS) - render SponsorCard instead of forcing a horizontal
// scroll on a phone-width viewport.
const CARD_BREAKPOINT = "(max-width: 767px)";

// Active and Suspended are both drawn from the same underlying active-sponsor list (a
// suspended sponsor is still active on the register, it just has a prior "removed" event
// in its history - see hydrateSponsorRows) - this narrows the filter-worker's result set
// to just the tab currently selected, rather than a separate fetch.
export function ResultsGrid({ statusFilter }: { statusFilter?: "active" | "suspended" } = {}) {
  const [parentEl, setParentEl] = useState<HTMLDivElement | null>(null);
  const parentRef = useCallback((node: HTMLDivElement | null) => setParentEl(node), []);
  const sponsorsById = useExplorerStore((s) => s.sponsorsById);
  const rawIds = useExplorerStore((s) => s.result.ids);
  const ids = useMemo(
    () => (statusFilter ? rawIds.filter((id) => sponsorsById?.get(id)?.status === statusFilter) : rawIds),
    [rawIds, sponsorsById, statusFilter]
  );
  const density = useExplorerStore((s) => s.filters.density);
  const sponsorsLoaded = useExplorerStore((s) => s.sponsors !== null);
  const isCardMode = useMediaQuery(CARD_BREAKPOINT);

  const rowHeight = isCardMode ? CARD_HEIGHT : ROW_HEIGHTS[density];

  const virtualizer = useVirtualizer({
    count: ids.length,
    getScrollElement: () => parentEl,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  function focusRow(index: number) {
    virtualizer.scrollToIndex(index, { align: "auto" });
    let attempts = 0;
    const tryFocus = () => {
      const el = parentEl?.querySelector<HTMLElement>(`[data-row-index="${index}"] a`);
      if (el) el.focus();
      else if (attempts++ < 5) requestAnimationFrame(tryFocus);
    };
    requestAnimationFrame(tryFocus);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const active = document.activeElement as HTMLElement | null;
    const idxAttr = active?.closest("[data-row-index]")?.getAttribute("data-row-index");
    if (idxAttr === null || idxAttr === undefined) return;
    const idx = Number(idxAttr);
    let next = idx;
    if (e.key === "ArrowDown") next = idx + 1;
    else if (e.key === "ArrowUp") next = idx - 1;
    else return;
    if (next < 0 || next >= ids.length) return;
    e.preventDefault();
    focusRow(next);
  }

  if (!sponsorsLoaded) return <SkeletonGrid density={density} isCardMode={isCardMode} />;
  if (ids.length === 0) return <EmptyState />;

  return (
    <GlassPanel elevation="base" className="flex h-full flex-col overflow-hidden">
      {/* One shared horizontal scroller for header + body, so columns never drift out of
          alignment - only the body underneath scrolls vertically on its own. */}
      <div className={`flex min-h-0 flex-1 flex-col ${isCardMode ? "" : "overflow-x-auto"}`}>
        {!isCardMode && <SponsorTableHeader />}
        <div
          ref={parentRef}
          onKeyDown={onKeyDown}
          className={`min-h-0 flex-1 overflow-y-auto ${isCardMode ? "w-full" : TABLE_MIN_WIDTH_CLASS}`}
          role="grid"
          aria-label="Sponsor results"
        >
          <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const sponsor = sponsorsById?.get(ids[virtualRow.index]);
              if (!sponsor) return null;
              return (
                <div
                  key={virtualRow.key}
                  role="row"
                  data-row-index={virtualRow.index}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}
                >
                  {isCardMode ? <SponsorCard sponsor={sponsor} height={rowHeight} /> : <SponsorTableRow sponsor={sponsor} height={rowHeight} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
