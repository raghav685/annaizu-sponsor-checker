import type { Density } from "@/lib/filterState";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ROW_HEIGHTS, CARD_HEIGHT, TABLE_MIN_WIDTH_CLASS, SponsorTableHeader } from "./SponsorTableRow";

function SkeletonBar({ index, rowHeight }: { index: number; rowHeight: number }) {
  return (
    <div className="border-b border-hairline px-5" style={{ height: rowHeight }}>
      <div
        className="h-full animate-pulse bg-white/[0.03]"
        style={{ animationDelay: `${(index % 8) * 80}ms`, marginTop: rowHeight * 0.28, height: rowHeight * 0.44, borderRadius: 6 }}
      />
    </div>
  );
}

function SkeletonCard({ index, rowHeight }: { index: number; rowHeight: number }) {
  const delay = `${(index % 8) * 80}ms`;
  return (
    <div className="flex flex-col justify-center gap-1.5 border-b border-hairline px-4 py-3" style={{ height: rowHeight }}>
      <div className="flex items-center justify-between gap-3">
        <div className="h-3.5 w-2/5 animate-pulse rounded bg-white/[0.03]" style={{ animationDelay: delay }} />
        <div className="h-3.5 w-8 animate-pulse rounded bg-white/[0.03]" style={{ animationDelay: delay }} />
      </div>
      <div className="h-3 w-3/5 animate-pulse rounded bg-white/[0.03]" style={{ animationDelay: delay }} />
      <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.03]" style={{ animationDelay: delay }} />
    </div>
  );
}

// Mirrors ResultsGrid's real structure (header + body sharing one horizontal
// scroller in table mode, no min-width and no header in card mode) so the
// loading state never overflows in a way the loaded state doesn't.
export function SkeletonGrid({ density, isCardMode }: { density: Density; isCardMode: boolean }) {
  const rowHeight = isCardMode ? CARD_HEIGHT : ROW_HEIGHTS[density];
  const count = Math.round(500 / rowHeight);
  return (
    <GlassPanel elevation="base" className="flex h-full flex-col overflow-hidden" aria-hidden>
      <div className={`flex min-h-0 flex-1 flex-col ${isCardMode ? "" : "overflow-x-auto"}`}>
        {!isCardMode && <SponsorTableHeader />}
        <div className={`min-h-0 flex-1 overflow-hidden ${isCardMode ? "w-full" : TABLE_MIN_WIDTH_CLASS}`}>
          {Array.from({ length: count }).map((_, i) =>
            isCardMode ? <SkeletonCard key={i} index={i} rowHeight={rowHeight} /> : <SkeletonBar key={i} index={i} rowHeight={rowHeight} />
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
