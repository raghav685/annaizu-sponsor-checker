import { GlassPanel } from "@/components/ui/GlassPanel";
import { useExplorerStore } from "@/lib/store";

export function EmptyState() {
  const resetFilters = useExplorerStore((s) => s.resetFilters);
  return (
    <GlassPanel elevation="base" className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 p-10 text-center">
      <p className="font-display text-lg text-mist">No sponsors match this combination</p>
      <p className="max-w-sm text-sm text-mist-dim">
        Try widening the route or region filters, or clearing the routes-held range - most sponsors hold exactly one route.
      </p>
      <button
        onClick={resetFilters}
        className="mt-1 rounded-lg border border-signal/40 bg-signal/10 px-4 py-2 font-mono text-xs text-signal hover:bg-signal/20"
      >
        Clear all filters
      </button>
    </GlassPanel>
  );
}
