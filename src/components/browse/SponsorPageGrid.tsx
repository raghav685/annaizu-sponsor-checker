import { GlassPanel } from "@/components/ui/GlassPanel";
import { SponsorCard } from "@/components/console/SponsorCard";
import type { Sponsor } from "@/lib/types";
import Link from "next/link";

export const PAGE_SIZE = 60;

// Pure presentational grid + pager, no hooks - safe to render both on the server (as the
// Suspense fallback for page 1, so it's real static/crawlable HTML) and inside the client
// component that corrects to the real `?page=` after hydration.
export function SponsorPageGrid({ sorted, page }: { sorted: Sponsor[]; page: number }) {
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map((s) => (
          <SponsorCard key={s.id} sponsor={s} compact={false} />
        ))}
      </div>

      {pageCount > 1 && (
        <GlassPanel elevation="base" className="mt-8 flex items-center justify-between p-4">
          <PageLink page={currentPage - 1} disabled={currentPage <= 1} label="← Previous" />
          <span className="font-mono text-xs text-mist-dim">
            Page {currentPage} of {pageCount}
          </span>
          <PageLink page={currentPage + 1} disabled={currentPage >= pageCount} label="Next →" />
        </GlassPanel>
      )}
    </>
  );
}

function PageLink({ page, disabled, label }: { page: number; disabled: boolean; label: string }) {
  if (disabled) {
    return <span className="rounded-lg px-3 py-1.5 font-mono text-xs text-mist-dim/40">{label}</span>;
  }
  return (
    <Link
      href={`?page=${page}`}
      className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-mist transition-colors hover:border-signal/40 hover:text-signal"
    >
      {label}
    </Link>
  );
}
