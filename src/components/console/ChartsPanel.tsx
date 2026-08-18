"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useExplorerStore } from "@/lib/store";
import { useInView } from "@/hooks/useInView";
import { ChartCard } from "./charts/ChartCard";
import { HorizontalBarChart } from "./charts/HorizontalBarChart";
import { RatingDonut } from "./charts/RatingDonut";
import { RoutesHistogram } from "./charts/RoutesHistogram";
import type { RatingFilter } from "@/lib/filterState";

const LicenceField = dynamic(() => import("@/components/story/LicenceField").then((m) => m.LicenceField), {
  ssr: false,
});

function sortedEntries(record: Record<string, number>, limit?: number) {
  const arr = Object.entries(record)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  return limit ? arr.slice(0, limit) : arr;
}

export function ChartsPanel() {
  const filters = useExplorerStore((s) => s.filters);
  const setFilters = useExplorerStore((s) => s.setFilters);
  const toggleListValue = useExplorerStore((s) => s.toggleListValue);
  const resultStats = useExplorerStore((s) => s.result.stats);
  const globalStats = useExplorerStore((s) => s.globalStats);

  const stats = resultStats ?? globalStats;
  const total = globalStats?.totalSponsors ?? 0;

  const regionData = useMemo(() => (stats ? sortedEntries(stats.byRegion) : []), [stats]);
  const routeData = useMemo(() => (stats ? sortedEntries(stats.byRoute) : []), [stats]);
  const sectorData = useMemo(() => (stats ? sortedEntries(stats.bySector) : []), [stats]);
  const townData = useMemo(
    () => (stats ? [...stats.topTowns].sort((a, b) => b.count - a.count).slice(0, 15) : []),
    [stats]
  );

  const liveTownCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of stats?.topTowns ?? []) out[t.name] = t.count;
    return out;
  }, [stats]);

  const { ref: fieldRef, inView: fieldInView } = useInView<HTMLDivElement>();

  if (!stats) return null;

  function toggleRating(rating: string) {
    setFilters({ rating: filters.rating === rating ? "All" : (rating as RatingFilter) });
  }

  function toggleRouteRange(n: number) {
    const isActive = filters.minRoutes === n && filters.maxRoutes === n;
    setFilters(isActive ? { minRoutes: 1, maxRoutes: 8 } : { minRoutes: n, maxRoutes: n });
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard
        title="Licence field"
        shown={stats.totalSponsors}
        total={total}
        footnote="Node size = sponsors per town in the current filtered set."
      >
        <div ref={fieldRef} className="h-48 w-full">
          {fieldInView && <LicenceField townCounts={liveTownCounts} className="h-full w-full" />}
        </div>
      </ChartCard>

      <ChartCard title="Sponsors by region" shown={stats.totalSponsors} total={total}>
        <HorizontalBarChart data={regionData} onBarClick={(name) => toggleListValue("regions", name)} selected={filters.regions} />
      </ChartCard>

      <ChartCard title="A vs B rating split" shown={stats.totalSponsors} total={total}>
        <RatingDonut byRating={stats.byRating} onSliceClick={toggleRating} />
      </ChartCard>

      <ChartCard title="Route distribution" shown={stats.totalSponsors} total={total}>
        <HorizontalBarChart data={routeData} onBarClick={(name) => toggleListValue("routes", name)} selected={filters.routes} />
      </ChartCard>

      <ChartCard title="Top 15 towns" shown={stats.totalSponsors} total={total}>
        <HorizontalBarChart data={townData} onBarClick={(name) => toggleListValue("towns", name)} selected={filters.towns} />
      </ChartCard>

      <ChartCard
        title="Sector breakdown"
        shown={stats.totalSponsors}
        total={total}
        footnote="Inferred from organisation name - not official Home Office data."
      >
        <HorizontalBarChart data={sectorData} onBarClick={(name) => toggleListValue("sectors", name)} selected={filters.sectors} />
      </ChartCard>

      <ChartCard title="Routes held per sponsor" shown={stats.totalSponsors} total={total}>
        <RoutesHistogram
          histogram={stats.routesPerSponsorHistogram}
          active={filters.minRoutes === filters.maxRoutes ? filters.minRoutes : undefined}
          onBarClick={toggleRouteRange}
        />
      </ChartCard>
    </div>
  );
}
