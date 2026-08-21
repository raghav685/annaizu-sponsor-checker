"use client";

import { useMemo, useState } from "react";
import { useExplorerStore } from "@/lib/store";
import { useFilterWorker } from "@/hooks/useFilterWorker";
import { Sidebar } from "./Sidebar";
import { SearchBar } from "./SearchBar";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { ResultsGrid } from "./ResultsGrid";
import { RemovedSponsorsPanel } from "./RemovedSponsorsPanel";
import { ChartsPanel } from "./ChartsPanel";
import { KpiStrip } from "./KpiStrip";
import type { KpiSummary } from "@/lib/dataQueries";
import { formatNumber } from "@/lib/formatNumber";

// Labels, not the internal "suspended"/"revoked" keys: neither is a status the GOV.UK register
// actually supplies. "suspended" here means "active now, but has a `removed` event somewhere in
// its history" - not a confirmed formal suspension. "revoked" means "not currently on the
// register" - 99.8% of that bucket has zero Companies House evidence of why. Labelling either
// as a specific legal action states more than the source supports (see DECISIONS.md).
const STATUS_TABS = [
  { key: "active", label: "Active" },
  { key: "suspended", label: "Reactivated" },
  { key: "revoked", label: "Removed" },
] as const;

export function ConsoleShell({ kpi }: { kpi: KpiSummary | null }) {
  useFilterWorker();
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]["key"]>("active");
  const rawResultIds = useExplorerStore((s) => s.result.ids);
  const sponsorsById = useExplorerStore((s) => s.sponsorsById);
  const totalCount = useExplorerStore((s) => s.globalStats?.totalSponsors ?? 0);
  const sponsorsLoaded = useExplorerStore((s) => s.sponsors !== null);
  const resultCount = useMemo(
    () => (statusTab === "revoked" ? rawResultIds.length : rawResultIds.filter((id) => sponsorsById?.get(id)?.status === statusTab).length),
    [rawResultIds, sponsorsById, statusTab]
  );

  return (
    <main className="relative z-content flex min-h-[100dvh] bg-void">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 lg:p-5">
        <h1 className="font-display text-lg font-semibold text-mist lg:text-xl">
          Search the UK register of licensed sponsors
        </h1>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-mono text-xs uppercase tracking-wide text-mist-dim">Search the register</h2>
            <div role="tablist" aria-label="Sponsor status" className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  id={`status-tab-${t.key}`}
                  aria-selected={statusTab === t.key}
                  aria-controls="status-tabpanel"
                  onClick={() => setStatusTab(t.key)}
                  className={`rounded-md px-3 py-1 font-mono text-xs transition-colors ${
                    statusTab === t.key ? "bg-white/[0.08] text-mist" : "text-mist-dim hover:text-mist"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {statusTab === "revoked" ? (
            <p className="mt-3 font-mono text-xs text-mist-dim">
              Sponsors observed leaving the register. Search and filters apply to the active/suspended lists only.
            </p>
          ) : (
            <>
              <div className="mt-3">
                <SearchBar />
              </div>
              <p aria-live="polite" className="mt-3 font-mono text-xs text-mist-dim">
                {sponsorsLoaded ? (
                  <>
                    <span className="text-signal">{formatNumber(resultCount)}</span> of {formatNumber(totalCount)} sponsors
                  </>
                ) : (
                  "loading register..."
                )}
              </p>
              <div className="mt-3">
                <ActiveFilterChips />
              </div>
            </>
          )}
        </div>
        <div
          id="status-tabpanel"
          role="tabpanel"
          aria-labelledby={`status-tab-${statusTab}`}
          className="h-[32rem] xl:h-[calc(100dvh-11rem)]"
        >
          {statusTab === "revoked" ? <RemovedSponsorsPanel /> : <ResultsGrid statusFilter={statusTab} />}
        </div>
        <div className="space-y-6 border-t border-hairline pt-5">
          <h2 className="font-mono text-xs uppercase tracking-wide text-mist-dim">Register insights</h2>
          {kpi && <KpiStrip kpi={kpi} />}
          <ChartsPanel />
        </div>
      </div>
    </main>
  );
}
