"use client";

import { useMemo, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { LineTrendChart } from "./charts/LineTrendChart";
import { CHART_COLORS } from "./charts/chartTheme";
import type { PublishTrendPoint } from "@/lib/dataQueries";
import { formatNumber } from "@/lib/formatNumber";

const RANGES = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "1y", label: "Past year", days: 365 },
  { key: "5y", label: "Past 5 years", days: 365 * 5 },
  { key: "all", label: "All time", days: Infinity },
] as const;

function formatShort(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function AnalyticsSection({ trend }: { trend: PublishTrendPoint[] }) {
  const [rangeKey, setRangeKey] = useState<(typeof RANGES)[number]["key"]>("1y");
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[2];

  const filtered = useMemo(() => {
    if (range.days === Infinity) return trend;
    const cutoff = Date.now() - range.days * 86_400_000;
    return trend.filter((p) => new Date(p.date).getTime() >= cutoff);
  }, [trend, range]);

  const addedSeries = filtered.map((p) => ({ label: formatShort(p.date), value: p.addedCount }));
  const activeSeries = filtered.map((p) => ({ label: formatShort(p.date), value: p.activeCountAfter }));
  const totalAdded = filtered.reduce((sum, p) => sum + p.addedCount, 0);
  const netChange = filtered.length > 0 ? filtered[filtered.length - 1].activeCountAfter - filtered[0].activeCountAfter : 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm text-mist">Analytics</h2>
          <p className="font-mono text-[11px] text-mist-dim">Trends and breakdowns based on completed publishes.</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={`rounded-lg px-2.5 py-1.5 font-mono text-[11px] transition-colors ${
                rangeKey === r.key ? "bg-white/[0.08] text-mist" : "text-mist-dim hover:text-mist"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length <= 1 ? (
        <GlassPanel elevation="base" className="p-6 text-center">
          <p className="font-mono text-sm text-mist-dim">
            {filtered.length === 0
              ? "No publishes recorded in this range yet."
              : "Only one publish recorded so far - a trend needs at least two. This will fill in as more publishes land."}
          </p>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GlassPanel elevation="base" className="p-4">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <div>
                <h3 className="font-display text-sm text-mist">Sponsors added over time</h3>
                <p className="font-mono text-[10.5px] text-mist-dim">New sponsors added to the register in this period</p>
              </div>
              <span className="shrink-0 font-mono text-sm text-signal">+{formatNumber(totalAdded)}</span>
            </div>
            <LineTrendChart data={addedSeries} color={CHART_COLORS.signal} />
          </GlassPanel>
          <GlassPanel elevation="base" className="p-4">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <div>
                <h3 className="font-display text-sm text-mist">Total active sponsors over time</h3>
                <p className="font-mono text-[10.5px] text-mist-dim">Net change in active sponsors over this period</p>
              </div>
              <span className={`shrink-0 font-mono text-sm ${netChange >= 0 ? "text-signal" : "text-ember"}`}>
                {netChange >= 0 ? "+" : ""}
                {formatNumber(netChange)}
              </span>
            </div>
            <LineTrendChart data={activeSeries} color={CHART_COLORS.ember} />
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
