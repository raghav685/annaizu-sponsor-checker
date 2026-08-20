"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { CheckboxRow, FieldsetGroup } from "@/components/ui/Controls";
import { ALL_REGIONS, ALL_SECTORS } from "@/lib/constants";
import type { TownCoverageRow } from "@/lib/dataQueries";

const LicenceField = dynamic(() => import("@/components/story/LicenceField").then((m) => m.LicenceField), { ssr: false });

export function CoverageMap({ rows }: { rows: TownCoverageRow[] }) {
  const [regions, setRegions] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const filtered = useMemo(
    () =>
      rows.filter((r) => (regions.length === 0 || regions.includes(r.region)) && (sectors.length === 0 || sectors.includes(r.sector))),
    [rows, regions, sectors]
  );

  const townCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of filtered) out[r.town] = (out[r.town] ?? 0) + r.count;
    return out;
  }, [filtered]);

  const sortedTowns = useMemo(() => Object.entries(townCounts).sort((a, b) => b[1] - a[1]), [townCounts]);
  const total = sortedTowns.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="order-2 lg:order-1">
        <GlassPanel elevation="raised" className="relative h-[26rem] overflow-hidden lg:h-[36rem]">
          <LicenceField townCounts={townCounts} className="h-full w-full" interactive />
          <div className="pointer-events-none absolute bottom-4 left-4 font-mono text-xs text-mist-dim">
            {total.toLocaleString()} active sponsor{total === 1 ? "" : "s"} across {sortedTowns.length.toLocaleString()} places
          </div>
          <div className="pointer-events-none absolute right-4 top-4 font-mono text-[10.5px] text-mist-dim/70">
            Drag to rotate · Scroll to zoom · Click a node to explore
          </div>
        </GlassPanel>

        <GlassPanel elevation="base" className="mt-4 max-h-72 overflow-y-auto p-4">
          <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
            {sortedTowns.slice(0, 60).map(([town, count]) => (
              <li key={town}>
                <Link
                  href={`/browse/city/${encodeURIComponent(town)}`}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-mist transition-colors hover:bg-white/5 hover:text-signal"
                >
                  <span className="truncate">{town}</span>
                  <span className="shrink-0 font-mono text-[11px] text-mist-dim">{count.toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </div>

      <GlassPanel as="aside" elevation="raised" className="order-1 h-fit space-y-5 p-4 lg:order-2 lg:p-5">
        <FieldsetGroup legend="Region">
          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {ALL_REGIONS.map((region) => (
              <CheckboxRow key={region} label={region} checked={regions.includes(region)} onChange={() => toggle(regions, setRegions, region)} />
            ))}
          </div>
        </FieldsetGroup>
        <FieldsetGroup legend="Industry (inferred)">
          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {ALL_SECTORS.map((sector) => (
              <CheckboxRow key={sector} label={sector} checked={sectors.includes(sector)} onChange={() => toggle(sectors, setSectors, sector)} />
            ))}
          </div>
        </FieldsetGroup>
        {(regions.length > 0 || sectors.length > 0) && (
          <button
            onClick={() => {
              setRegions([]);
              setSectors([]);
            }}
            className="font-mono text-xs text-signal hover:underline"
          >
            Clear filters
          </button>
        )}
      </GlassPanel>
    </div>
  );
}
