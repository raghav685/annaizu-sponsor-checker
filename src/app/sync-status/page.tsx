import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { syncRuns } from "@/db/schema";
import { GlassPanel } from "@/components/ui/GlassPanel";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  success: "text-signal border-signal/40 bg-signal/10",
  no_change: "text-mist-dim border-white/10 bg-white/5",
  running: "text-mist-dim border-white/10 bg-white/5",
  failed: "text-ember border-ember/40 bg-ember/10",
  halted_for_review: "text-ember border-ember/40 bg-ember/10",
};

function formatDate(d: Date | string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default async function SyncStatusPage() {
  const runs = await db.query.syncRuns.findMany({
    orderBy: [desc(syncRuns.startedAt)],
    limit: 50,
  });

  return (
    <main className="min-h-[100dvh] bg-void px-6 py-16 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-2xl font-semibold text-mist">Sync run history</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist-dim">
          Every attempt to pull the register from GOV.UK, whether it changed anything or not. This is the operational
          record behind the site - every figure elsewhere traces back to one of these runs.
        </p>

        <GlassPanel elevation="base" className="mt-8 overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-hairline text-mist-dim">
                <th className="px-4 py-3 font-normal">Run</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Started</th>
                <th className="px-4 py-3 font-normal">Register date</th>
                <th className="px-4 py-3 font-normal">Rows</th>
                <th className="px-4 py-3 font-normal">Added</th>
                <th className="px-4 py-3 font-normal">Removed</th>
                <th className="px-4 py-3 font-normal">Updated</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 text-mist">#{r.id}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 ${STATUS_STYLE[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mist-dim">{formatDate(r.startedAt)}</td>
                  <td className="px-4 py-3 text-mist-dim">{formatDate(r.registerPublicUpdatedAt)}</td>
                  <td className="px-4 py-3 text-mist-dim">{r.rowCount?.toLocaleString() ?? "-"}</td>
                  <td className="px-4 py-3 text-signal">{r.sponsorsAddedCount?.toLocaleString() ?? "-"}</td>
                  <td className="px-4 py-3 text-ember">{r.sponsorsRemovedCount?.toLocaleString() ?? "-"}</td>
                  <td className="px-4 py-3 text-mist-dim">{r.sponsorsUpdatedCount?.toLocaleString() ?? "-"}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-mist-dim">
                    No sync runs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </GlassPanel>
      </div>
    </main>
  );
}
