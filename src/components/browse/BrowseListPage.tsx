import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SponsorPageGrid } from "./SponsorPageGrid";
import { PagedGridServer } from "./PagedGridServer";
import type { Sponsor } from "@/lib/types";
import type { Crumb } from "@/lib/seo";
import { formatNumber } from "@/lib/formatNumber";

// This component itself never awaits `searchParamsPromise` - it just forwards the raw Promise
// to PagedGridServer, which is the only thing wrapped in Suspense. Next.js tracks a *read* of
// searchParams as the dynamic-opt-out trigger, not merely receiving the Promise as a prop, so
// everything above the Suspense boundary (title, breadcrumbs, count, and the fallback grid
// below) still statically prerenders via generateStaticParams + revalidate:300. Confirmed
// against production this mattered: the previous version (which awaited `searchParams` in the
// page component itself) served `Cache-Control: private, no-cache, no-store, must-revalidate`
// and `x-vercel-cache: MISS` on every single request across all ~6,800 of these pages.
export function BrowseListPage({
  kicker,
  title,
  sponsors,
  crumbs,
  registerDate,
  searchParamsPromise,
}: {
  kicker: string;
  title: string;
  sponsors: Sponsor[];
  crumbs: Crumb[];
  registerDate?: string;
  searchParamsPromise: Promise<{ page?: string }>;
}) {
  if (sponsors.length === 0) notFound();

  const sorted = [...sponsors].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="relative min-h-[100dvh] bg-void px-6 py-12 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Breadcrumbs crumbs={crumbs} />
        <p className="mt-4 font-mono text-xs uppercase tracking-wide text-mist-dim/70">{kicker}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-mist lg:text-3xl">{title}</h1>
        <p className="mt-2 font-mono text-sm text-mist-dim">
          {formatNumber(sorted.length)} active sponsor{sorted.length === 1 ? "" : "s"}
          {registerDate ? ` · register date ${registerDate}` : ""}
        </p>
        <p className="mt-1 max-w-2xl font-mono text-xs text-mist-dim/70">
          Being listed means an organisation holds a sponsor licence - it does not indicate current vacancies or
          that any particular application will be sponsored.
        </p>

        <Suspense fallback={<SponsorPageGrid sorted={sorted} page={1} />}>
          <PagedGridServer sorted={sorted} searchParamsPromise={searchParamsPromise} />
        </Suspense>
      </div>
    </main>
  );
}
