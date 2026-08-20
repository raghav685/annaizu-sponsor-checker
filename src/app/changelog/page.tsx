import type { Metadata } from "next";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EventsFeed } from "@/components/changelog/EventsFeed";
import { loadSyncRunHistory, loadRecentEvents, type SyncRunSummary } from "@/lib/dataQueries";
import { buildMetadata } from "@/lib/seo";
import { formatNumber } from "@/lib/formatNumber";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "UK Sponsor Register Changes & Updates | Annaizu",
  description: "Publish-by-publish history of the UK licensed sponsors register: additions, removals, rating and route changes.",
  path: "/changelog",
});

const STATUS_LABEL: Record<string, string> = {
  success: "Published",
  no_change: "No change",
  halted_for_review: "Halted for review",
};

const STATUS_COLOR: Record<string, string> = {
  success: "text-signal",
  no_change: "text-mist-dim",
  halted_for_review: "text-ember",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function RunRow({ run }: { run: SyncRunSummary }) {
  return (
    <tr className="border-b border-hairline last:border-b-0">
      <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs text-mist">{formatDateTime(run.registerDate)}</td>
      <td className={`whitespace-nowrap py-2.5 pr-4 font-mono text-xs ${STATUS_COLOR[run.status] ?? "text-mist-dim"}`}>
        {STATUS_LABEL[run.status] ?? run.status}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs text-signal">{run.addedCount != null ? `+${formatNumber(run.addedCount)}` : "—"}</td>
      <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs text-ember">{run.removedCount != null ? formatNumber(run.removedCount) : "—"}</td>
      <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs text-mist-dim">{run.updatedCount != null ? formatNumber(run.updatedCount) : "—"}</td>
      <td className="whitespace-nowrap py-2.5 font-mono text-xs text-mist-dim">{run.rowCount != null ? formatNumber(run.rowCount) : "—"}</td>
    </tr>
  );
}

export default async function ChangelogPage() {
  const [runs, initial] = await Promise.all([loadSyncRunHistory(), loadRecentEvents(40, 0)]);

  return (
    <main className="relative min-h-[100dvh] bg-void px-6 py-12 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Changelog", href: "/changelog" }]} />
        <h1 className="mt-4 font-display text-2xl font-semibold text-mist lg:text-3xl">UK sponsor register changes</h1>
        <p className="mt-2 font-mono text-sm text-mist-dim">Every publish this site has ingested, and the individual sponsor-level changes behind it.</p>

        <GlassPanel elevation="raised" className="mt-6 border-ember/30 bg-ember/[0.04] p-4 text-sm leading-relaxed text-mist">
          <p>
            <strong className="text-ember">A note on &quot;removed&quot; entries.</strong> Sponsor identity here is keyed by (organisation
            name, town). Until Companies House cross-referencing ships, a rename or an office relocation looks identical to a genuine
            licence loss in this feed - both appear as a removal followed by an addition. Treat every &quot;removed from the register&quot;
            entry below as <em>observed register movement</em>, not confirmed licence loss.
          </p>
        </GlassPanel>

        <section className="mt-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-mist-dim">Publish history</h2>
          <GlassPanel elevation="base" className="overflow-x-auto p-4 lg:p-5">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline-strong">
                  <th className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-wide text-mist-dim/70">Register date</th>
                  <th className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-wide text-mist-dim/70">Status</th>
                  <th className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-wide text-mist-dim/70">Added</th>
                  <th className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-wide text-mist-dim/70">Removed</th>
                  <th className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-wide text-mist-dim/70">Updated</th>
                  <th className="pb-2 font-mono text-[10px] uppercase tracking-wide text-mist-dim/70">Rows</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <RunRow key={r.id} run={r} />
                ))}
              </tbody>
            </table>
            {runs.length === 0 && <p className="py-4 text-center font-mono text-xs text-mist-dim">No publishes recorded yet.</p>}
          </GlassPanel>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-mist-dim">Recent sponsor-level events</h2>
          <EventsFeed initialEvents={initial.events} total={initial.total} />
        </section>
      </div>
    </main>
  );
}
