import Link from "next/link";
import type { Metadata } from "next";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { loadBrowseIndex, type BrowseIndexEntry } from "@/lib/dataQueries";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Browse UK Licensed Sponsors by City, Industry & Route | Annaizu",
  description: "Browse UK licensed sponsors by city, inferred industry, and visa route.",
  path: "/browse",
});

function IndexColumn({ title, entries, hrefFor }: { title: string; entries: BrowseIndexEntry[]; hrefFor: (e: BrowseIndexEntry) => string }) {
  return (
    <div>
      <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-mist-dim">
        {title} <span className="text-mist-dim/50">({entries.length})</span>
      </h2>
      <GlassPanel elevation="base" className="max-h-[32rem] overflow-y-auto p-2">
        <ul>
          {entries.map((e) => (
            <li key={e.slug}>
              <Link
                href={hrefFor(e)}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-mist transition-colors hover:bg-white/5 hover:text-signal"
              >
                <span className="truncate">{e.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-mist-dim">{e.count.toLocaleString()}</span>
              </Link>
            </li>
          ))}
        </ul>
      </GlassPanel>
    </div>
  );
}

export default async function BrowsePage() {
  const { cities, sectors, routes } = await loadBrowseIndex();

  return (
    <main className="relative min-h-[100dvh] bg-void px-6 py-12 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Browse", href: "/browse" }]} />
        <h1 className="mt-4 font-display text-2xl font-semibold text-mist lg:text-3xl">Browse the register</h1>
        <p className="mt-2 font-mono text-sm text-mist-dim">
          Every active sponsor, grouped by city, inferred industry, and visa route. For full filtering, use the{" "}
          <Link href="/sponsors" className="text-signal hover:underline">
            explorer
          </Link>
          .
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <IndexColumn title="Cities & towns" entries={cities} hrefFor={(e) => `/browse/city/${encodeURIComponent(e.name)}`} />
          <IndexColumn title="Industry (inferred)" entries={sectors} hrefFor={(e) => `/browse/industry/${e.slug}`} />
          <IndexColumn title="Visa route" entries={routes} hrefFor={(e) => `/browse/route/${encodeURIComponent(e.name)}`} />
        </div>
      </div>
    </main>
  );
}
