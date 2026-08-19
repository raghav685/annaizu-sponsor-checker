"use client";

import { useMemo } from "react";
import { useExplorerStore } from "@/lib/store";
import { ALL_REGIONS, ALL_SECTORS, RATING_OPTIONS, SPONSOR_TYPE_OPTIONS, SORT_OPTIONS, routeGroupOf } from "@/lib/constants";
import { ROUTE_RANGE_CEILING, activeFilterCount } from "@/lib/filterState";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { CheckboxRow, FieldsetGroup, SegmentedControl, ToggleSwitch } from "@/components/ui/Controls";
import { TypeaheadMultiSelect } from "@/components/ui/TypeaheadMultiSelect";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { exportSponsorsCsv } from "@/lib/export";
import { X } from "@phosphor-icons/react/dist/csr/X";

export function Sidebar() {
  const filters = useExplorerStore((s) => s.filters);
  const setFilters = useExplorerStore((s) => s.setFilters);
  const toggleListValue = useExplorerStore((s) => s.toggleListValue);
  const resetFilters = useExplorerStore((s) => s.resetFilters);
  const globalStats = useExplorerStore((s) => s.globalStats);
  const resultStats = useExplorerStore((s) => s.result.stats);
  const sponsors = useExplorerStore((s) => s.sponsors);
  const sponsorsById = useExplorerStore((s) => s.sponsorsById);
  const resultIds = useExplorerStore((s) => s.result.ids);
  const sidebarOpen = useExplorerStore((s) => s.sidebarOpen);
  const setSidebarOpen = useExplorerStore((s) => s.setSidebarOpen);

  const stats = resultStats ?? globalStats;

  const townOptions = useMemo(() => {
    if (!sponsors) return [];
    const m = new Map<string, number>();
    for (const s of sponsors) if (s.town) m.set(s.town, (m.get(s.town) ?? 0) + 1);
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [sponsors]);

  const countyOptions = useMemo(() => {
    if (!sponsors) return [];
    const m = new Map<string, number>();
    for (const s of sponsors) if (s.county) m.set(s.county, (m.get(s.county) ?? 0) + 1);
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [sponsors]);

  const routesByGroup = useMemo(() => {
    const byRoute = stats?.byRoute ?? {};
    const groups: Record<string, Array<{ name: string; count: number }>> = {
      Worker: [],
      "Temporary Worker": [],
      Other: [],
    };
    for (const [route, count] of Object.entries(byRoute)) {
      groups[routeGroupOf(route)].push({ name: route, count });
    }
    for (const key of Object.keys(groups)) groups[key].sort((a, b) => b.count - a.count);
    return groups;
  }, [stats]);

  const activeCount = activeFilterCount(filters);

  function copyShareableLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  }

  function handleExport() {
    if (!sponsorsById) return;
    const rows = resultIds.map((id) => sponsorsById.get(id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
    exportSponsorsCsv(rows);
  }

  return (
    <>
      {sidebarOpen && (
        <button
          aria-label="Close filters"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-[44] bg-void/70 backdrop-blur-sm lg:hidden"
        />
      )}
      <GlassPanel
        as="aside"
        elevation="raised"
        aria-label="Filters"
        className={`fixed inset-y-0 left-0 z-[45] w-[19rem] overflow-y-auto rounded-none border-y-0 border-l-0 p-5 transition-transform duration-300 lg:sticky lg:top-0 lg:h-[100dvh] lg:translate-x-0 lg:rounded-2xl lg:border ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="font-display text-sm text-mist">Filters</span>
          <button aria-label="Close filters" onClick={() => setSidebarOpen(false)} className="p-1">
            <X className="h-5 w-5 text-mist-dim" />
          </button>
        </div>

        <div className="space-y-5">
          <FieldsetGroup legend="Region">
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {ALL_REGIONS.map((region) => (
                <CheckboxRow
                  key={region}
                  label={region}
                  checked={filters.regions.includes(region)}
                  onChange={() => toggleListValue("regions", region)}
                  count={stats?.byRegion[region] ?? 0}
                />
              ))}
            </div>
          </FieldsetGroup>

          <FieldsetGroup legend="Town / City">
            <TypeaheadMultiSelect
              label="Filter by town or city"
              placeholder="Search towns..."
              options={townOptions}
              selected={filters.towns}
              onToggle={(v) => toggleListValue("towns", v)}
            />
          </FieldsetGroup>

          <FieldsetGroup legend="County">
            <TypeaheadMultiSelect
              label="Filter by county"
              placeholder="Search counties..."
              options={countyOptions}
              selected={filters.counties}
              onToggle={(v) => toggleListValue("counties", v)}
            />
          </FieldsetGroup>

          <FieldsetGroup legend="Route">
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {(["Worker", "Temporary Worker", "Other"] as const).map((group) =>
                routesByGroup[group].length ? (
                  <div key={group}>
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-mist-dim/70">{group}</p>
                    {routesByGroup[group].map((r) => (
                      <CheckboxRow
                        key={r.name}
                        label={r.name}
                        checked={filters.routes.includes(r.name)}
                        onChange={() => toggleListValue("routes", r.name)}
                        count={r.count}
                      />
                    ))}
                  </div>
                ) : null
              )}
            </div>
          </FieldsetGroup>

          <FieldsetGroup legend="Rating">
            <SegmentedControl
              ariaLabel="Rating"
              options={RATING_OPTIONS}
              value={filters.rating}
              onChange={(v) => setFilters({ rating: v })}
            />
          </FieldsetGroup>

          <FieldsetGroup legend="Sponsor type">
            <SegmentedControl
              ariaLabel="Sponsor type"
              options={SPONSOR_TYPE_OPTIONS}
              value={filters.sponsorType}
              onChange={(v) => setFilters({ sponsorType: v })}
            />
          </FieldsetGroup>

          <FieldsetGroup legend="Sector (inferred)">
            <details className="mb-2 rounded-md bg-white/[0.03] px-2.5 py-1.5 text-xs text-mist-dim">
              <summary className="cursor-pointer select-none">How this is derived</summary>
              <p className="mt-1.5 leading-relaxed">
                Sector is guessed from keywords in the organisation name (e.g. &quot;care&quot;, &quot;construction&quot;).
                It is not part of the official Home Office register and will be wrong for some organisations.
              </p>
            </details>
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {ALL_SECTORS.map((sector) => (
                <CheckboxRow
                  key={sector}
                  label={sector}
                  checked={filters.sectors.includes(sector)}
                  onChange={() => toggleListValue("sectors", sector)}
                  count={stats?.bySector[sector] ?? 0}
                />
              ))}
            </div>
          </FieldsetGroup>

          <FieldsetGroup legend="Routes held">
            <RangeSlider
              label="Number of routes held"
              min={1}
              max={ROUTE_RANGE_CEILING}
              valueMin={filters.minRoutes}
              valueMax={filters.maxRoutes}
              onChange={(min, max) => setFilters({ minRoutes: min, maxRoutes: max })}
            />
          </FieldsetGroup>

          <FieldsetGroup legend="Quick toggles">
            <ToggleSwitch
              label="A-rated only"
              checked={filters.aRatedOnly}
              onChange={(v) => setFilters({ aRatedOnly: v })}
            />
            <ToggleSwitch
              label="Multiple routes only"
              checked={filters.multiRouteOnly}
              onChange={(v) => setFilters({ multiRouteOnly: v })}
            />
            <ToggleSwitch
              label="Hide unknown region"
              checked={filters.hideUnknownRegion}
              onChange={(v) => setFilters({ hideUnknownRegion: v })}
            />
          </FieldsetGroup>

          <FieldsetGroup legend="Sort">
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ sort: e.target.value as typeof filters.sort })}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-sm text-mist"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-steel">
                  {opt.label}
                </option>
              ))}
            </select>
          </FieldsetGroup>

          <FieldsetGroup legend="Density">
            <SegmentedControl
              ariaLabel="Density"
              options={["comfortable", "compact"] as const}
              value={filters.density}
              onChange={(v) => setFilters({ density: v })}
            />
          </FieldsetGroup>
        </div>

        <div className="sticky bottom-0 mt-6 -mx-5 space-y-2 border-t border-hairline bg-steel/90 px-5 pb-1 pt-4 backdrop-blur-xl">
          <div className="flex items-center justify-between font-mono text-xs text-mist-dim">
            <span>{activeCount} active filter{activeCount === 1 ? "" : "s"}</span>
            <button onClick={resetFilters} className="text-signal hover:underline" disabled={activeCount === 0 && !filters.search}>
              Clear all
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyShareableLink}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] py-2 font-mono text-xs text-mist transition-colors hover:border-signal/40 hover:text-signal"
            >
              Copy link
            </button>
            <button
              onClick={handleExport}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] py-2 font-mono text-xs text-mist transition-colors hover:border-signal/40 hover:text-signal"
            >
              Export CSV
            </button>
          </div>
          <div className="pb-3" />
        </div>
      </GlassPanel>
    </>
  );
}
