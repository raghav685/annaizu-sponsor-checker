import { Buildings } from "@phosphor-icons/react/dist/csr/Buildings";
import { TrendUp } from "@phosphor-icons/react/dist/csr/TrendUp";
import { Prohibit } from "@phosphor-icons/react/dist/csr/Prohibit";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { CalendarBlank } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import type { Icon } from "@phosphor-icons/react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { KpiSummary } from "@/lib/dataQueries";
import { formatNumber } from "@/lib/formatNumber";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function SyncBadge({ finishedAt }: { finishedAt: string | null }) {
  const days = daysSince(finishedAt);
  const stale = days === null || days > 2;
  const label = days === null ? "No sync recorded" : days === 0 ? "Synced today" : days === 1 ? "Synced yesterday" : `Synced ${days} days ago`;
  const Icon = stale ? WarningCircle : CheckCircle;
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs ${
        stale ? "border-ember/30 bg-ember/10 text-ember" : "border-signal/30 bg-signal/10 text-signal"
      }`}
    >
      <Icon className="h-4 w-4" weight="fill" />
      <span>{label}</span>
    </div>
  );
}

// `primary` gives the one headline metric (active sponsors) a size step up -
// the other four are equally-weighted supporting figures, not five things
// competing for the same attention.
function Tile({ label, value, icon: TileIcon, color, primary = false }: { label: string; value: string; icon: Icon; color: string; primary?: boolean }) {
  return (
    <GlassPanel elevation="base" className={`min-w-0 flex-1 p-4 ${primary ? "sm:flex-[1.4]" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 font-mono text-[10px] uppercase tracking-wide text-mist-dim/70">{label}</p>
        <TileIcon className={`h-4 w-4 shrink-0 ${color}`} />
      </div>
      <p className={`mt-2.5 font-display font-semibold leading-none ${color} ${primary ? "text-2xl lg:text-3xl" : "text-xl lg:text-2xl"}`}>{value}</p>
    </GlassPanel>
  );
}

export function KpiStrip({ kpi }: { kpi: KpiSummary }) {
  const publish = kpi.latestPublish;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs text-mist-dim">Browse the latest list and changes.</p>
        <SyncBadge finishedAt={publish?.finishedAt ?? null} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Tile label="Active sponsors" value={formatNumber(kpi.activeCount)} icon={Buildings} color="text-mist" primary />
        <Tile
          label="Added (latest publish)"
          value={publish ? `+${formatNumber(publish.addedCount)}` : "—"}
          icon={TrendUp}
          color="text-signal"
        />
        <Tile
          label="Removed from register"
          value={publish ? formatNumber(publish.removedCount) : "—"}
          icon={Prohibit}
          color="text-ember"
        />
        <Tile
          label="Updated (latest publish)"
          value={publish ? formatNumber(publish.updatedCount) : "—"}
          icon={ArrowsClockwise}
          color="text-info"
        />
        <Tile label="Register date" value={formatDate(publish?.registerDate ?? null)} icon={CalendarBlank} color="text-mist" />
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-mist-dim/60">
        {kpi.historyBeginsAt && <>Sync history begins {formatDate(kpi.historyBeginsAt)} · </>}
        &quot;Removed&quot; is observed register movement, not confirmed licence loss.
      </p>
    </div>
  );
}
