"use client";

import { useEffect, useMemo, useState } from "react";
import { useExplorerStore } from "@/lib/store";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ALL_REGIONS, ALL_SECTORS, RATING_OPTIONS, SPONSOR_TYPE_OPTIONS, SORT_OPTIONS, routeGroupOf } from "@/lib/constants";
import { ROUTE_RANGE_CEILING, activeFilterCount } from "@/lib/filterState";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { CheckboxRow, FieldsetGroup, SegmentedControl, ToggleSwitch } from "@/components/ui/Controls";
import { TypeaheadMultiSelect } from "@/components/ui/TypeaheadMultiSelect";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { exportSponsorsCsv } from "@/lib/export";
import { filtersToParams } from "@/lib/filterState";
import type { Sponsor } from "@/lib/types";
import { X } from "@phosphor-icons/react/dist/csr/X";

export function Sidebar() {
  const filters = useExplorerStore((s) => s.filters);
  const setFilters = useExplorerStore((s) => s.setFilters);
  const toggleListValue = useExplorerStore((s) => s.toggleListValue);
  const resetFilters = useExplorerStore((s) => s.resetFilters);
  const globalStats = useExplorerStore((s) => s.globalStats);
  const resultStats = useExplorerStore((s) => s.result.stats);
  const townFacets = useExplorerStore((s) => s.townFacets);
  const countyFacets = useExplorerStore((s) => s.countyFacets);
  const setFacets = useExplorerStore((s) => s.setFacets);
  const sidebarOpen = useExplorerStore((s) => s.sidebarOpen);
  const setSidebarOpen = useExplorerStore((s) => s.setSidebarOpen);
  const isDrawerViewport = useMediaQuery("(max-width: 1023px)");
  const drawerClosed = isDrawerViewport && !sidebarOpen;
  const [exporting, setExporting] = useState(false);

  const stats = resultStats ?? globalStats;

  useEffect(() => {
    fetch("/api/data/facets")
      .then((r) => r.json() as Promise<{ towns: { name: string; count: number }[]; counties: { name: string; count: number }[] }>)
      .then(setFacets)
      .catch((err) => console.error("Failed to load town/county facets", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const townOptions = useMemo(() => townFacets.map((f) => ({ name: f.name, count: f.count })), [townFacets]);
  const countyOptions = useMemo(() => countyFacets.map((f) => ({ name: f.name, count: f.count })), [countyFacets]);

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

  // A deliberate bulk export, distinct from paginated browsing - fetches every matching row
  // in one request (server-capped, see /api/data/sponsors's MAX_EXPORT_ROWS) rather than the
  // page-at-a-time results the table itself shows.
  function handleExport() {
    if (exporting) return;
    setExporting(true);
    const params = filtersToParams(filters);
    params.set("all", "1");
    fetch(`/api/data/sponsors?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json() as Promise<{ rows: Sponsor[] }>;
      })
      .then((data) => exportSponsorsCsv(data.rows))
      .catch((err) => console.error("Failed to export sponsors CSV", err))
      .finally(() => setExporting(false));
  }

  return (
    <>
      {sidebarOpen && (
        <button
          aria-label="Close filters"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-[var(--z-sidebar-scrim)] bg-void/70 backdrop-blur-sm lg:hidden"
        />
      )}
      <GlassPanel
        as="aside"
        elevation="raised"
        aria-label="Filters"
        inert={drawerClosed}
        className={`fixed inset-y-0 left-0 z-[var(--z-sidebar)] w-[19rem] overflow-y-auto rounded-none border-y-0 border-l-0 p-5 transition-transform duration-300 lg:sticky lg:top-0 lg:h-[100dvh] lg:translate-x-0 lg:rounded-2xl lg:border ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="font-display text-sm text-mist">Filters</span>
          <button aria-label="Close filters" onClick={() => setSidebarOpen(false)} className="p-1">
            <X className="h-5 w-5 text-mist-dim" />
          </button>
        </div>

        <div className="space-y-5 pb-28">
          <FieldsetGroup legend="Region">
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {ALL_REGIONS.map((region) => (
                <CheckboxRow
                  key={region}
                  label={region}
                  checked={filters.regions.includes(region)}
                  onChange={() => toggleListValue("regions", region)}
                  count={stats ? stats.byRegion[region] ?? 0 : undefined}
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
            <details className="group mb-2 rounded-md bg-white/[0.03] px-2.5 py-1.5 text-xs text-mist-dim">
              <summary className="cursor-pointer select-none">How this is derived</summary>
              <p className="mt-1.5 hidden leading-relaxed group-open:block">
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
                  count={stats ? stats.bySector[sector] ?? 0 : undefined}
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
              className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-white/[0.03] py-2 font-mono text-xs text-mist transition-colors hover:border-signal/40 hover:text-signal"
            >
              Copy link
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-white/[0.03] py-2 font-mono text-xs text-mist transition-colors hover:border-signal/40 hover:text-signal disabled:pointer-events-none disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
          <div className="pb-3" />
        </div>
      </GlassPanel>
    </>
  );
}
