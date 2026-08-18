"use client";

import { useExplorerStore } from "@/lib/store";
import { Chip } from "@/components/ui/Chip";

export function ActiveFilterChips() {
  const filters = useExplorerStore((s) => s.filters);
  const setFilters = useExplorerStore((s) => s.setFilters);
  const toggleListValue = useExplorerStore((s) => s.toggleListValue);

  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  for (const region of filters.regions) chips.push({ key: `r-${region}`, label: region, onRemove: () => toggleListValue("regions", region) });
  for (const town of filters.towns) chips.push({ key: `t-${town}`, label: town, onRemove: () => toggleListValue("towns", town) });
  for (const county of filters.counties) chips.push({ key: `c-${county}`, label: county, onRemove: () => toggleListValue("counties", county) });
  for (const route of filters.routes) chips.push({ key: `rt-${route}`, label: route, onRemove: () => toggleListValue("routes", route) });
  for (const sector of filters.sectors) chips.push({ key: `s-${sector}`, label: sector, onRemove: () => toggleListValue("sectors", sector) });
  if (filters.rating !== "All") chips.push({ key: "rating", label: `Rating: ${filters.rating}`, onRemove: () => setFilters({ rating: "All" }) });
  if (filters.sponsorType !== "All") chips.push({ key: "type", label: filters.sponsorType, onRemove: () => setFilters({ sponsorType: "All" }) });
  if (filters.aRatedOnly) chips.push({ key: "arated", label: "A-rated only", onRemove: () => setFilters({ aRatedOnly: false }) });
  if (filters.multiRouteOnly) chips.push({ key: "multi", label: "Multiple routes only", onRemove: () => setFilters({ multiRouteOnly: false }) });
  if (filters.hideUnknownRegion) chips.push({ key: "hideunknown", label: "Hiding unknown region", onRemove: () => setFilters({ hideUnknownRegion: false }) });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {chips.map((c) => (
        <Chip key={c.key} label={c.label} onRemove={c.onRemove} />
      ))}
    </div>
  );
}
