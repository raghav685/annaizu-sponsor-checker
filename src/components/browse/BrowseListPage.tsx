import Link from "next/link";
import { notFound } from "next/navigation";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SponsorCard } from "@/components/console/SponsorCard";
import type { Sponsor } from "@/lib/types";

const PAGE_SIZE = 60;

export function BrowseListPage({
  kicker,
  title,
  sponsors,
  page,
}: {
  kicker: string;
  title: string;
  sponsors: Sponsor[];
  page: number;
}) {
  if (sponsors.length === 0) notFound();

  const sorted = [...sponsors].sort((a, b) => a.name.localeCompare(b.name));
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main className="relative min-h-[100dvh] bg-void px-6 py-12 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Link href="/browse" className="font-mono text-xs text-mist-dim hover:text-signal">
          ← Browse
        </Link>
        <p className="mt-4 font-mono text-xs uppercase tracking-wide text-mist-dim/70">{kicker}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-mist lg:text-3xl">{title}</h1>
        <p className="mt-2 font-mono text-sm text-mist-dim">{sorted.length.toLocaleString()} active sponsor{sorted.length === 1 ? "" : "s"}</p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((s) => (
            <SponsorCard key={s.id} sponsor={s} compact={false} />
          ))}
        </div>

        {pageCount > 1 && (
          <GlassPanel elevation="base" className="mt-8 flex items-center justify-between p-3">
            <PageLink page={currentPage - 1} disabled={currentPage <= 1} label="← Previous" />
            <span className="font-mono text-xs text-mist-dim">
              Page {currentPage} of {pageCount}
            </span>
            <PageLink page={currentPage + 1} disabled={currentPage >= pageCount} label="Next →" />
          </GlassPanel>
        )}
      </div>
    </main>
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
