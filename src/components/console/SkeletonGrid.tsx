import type { Density } from "@/lib/filterState";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SponsorTableHeader } from "./SponsorTableRow";

export function SkeletonGrid({ density }: { density: Density }) {
  const rowHeight = density === "compact" ? 44 : 56;
  const count = Math.round(500 / rowHeight);
  return (
    <GlassPanel elevation="base" className="flex h-full flex-col overflow-hidden" aria-hidden>
      <SponsorTableHeader />
      <div className="min-h-0 flex-1 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="border-b border-hairline px-4" style={{ height: rowHeight }}>
            <div
              className="h-full animate-pulse bg-white/[0.03]"
              style={{ animationDelay: `${(i % 8) * 80}ms`, marginTop: rowHeight * 0.28, height: rowHeight * 0.44, borderRadius: 6 }}
            />
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
