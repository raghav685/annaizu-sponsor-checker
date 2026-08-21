import type { Metadata } from "next";
import { BrowseListPage } from "@/components/browse/BrowseListPage";
import { loadBrowseIndex, loadSponsorsByCity, loadMetaForFrontend } from "@/lib/dataQueries";
import { buildMetadata } from "@/lib/seo";
import { decodeRouteParam } from "@/lib/slug";

export const revalidate = 300;

interface Props {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ page?: string }>;
}

// Only the largest cities are pre-rendered at build time; `cities` is already sorted by count
// descending. Pre-building all ~6,800 of them meant a real loadSponsorsByCity() query - and
// real data transfer - for every single one, on every single build, contributing directly to
// exhausting Supabase's data-transfer quota mid-build (production `PostgresError 53000`,
// 2026-08-21). `dynamicParams` defaults to true, so a town outside this list still renders
// correctly on its first real request - just on-demand instead of eagerly, then cached for
// `revalidate` seconds like any other page. This is the standard ISR fallback pattern, not a
// feature change: every city page still exists and is still crawlable/indexable.
const BUILD_TIME_CITY_LIMIT = 300;

export async function generateStaticParams() {
  const { cities } = await loadBrowseIndex();
  return cities.slice(0, BUILD_TIME_CITY_LIMIT).map((c) => ({ city: c.name }));
}

// Deliberately does not read `searchParams` - see BrowseListPage.tsx for why. Every paginated
// view (?page=2, ?page=3, ...) canonicalises to this same base path: they're the same content
// re-sliced, not distinct pages worth ranking separately.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = decodeRouteParam((await params).city);
  const basePath = `/browse/city/${encodeURIComponent(city)}`;
  return buildMetadata({
    title: `Licensed UK Visa Sponsors in ${city} | Sponsor List | Annaizu`,
    description: `Browse organisations in ${city} that appear on the current GOV.UK register of licensed Worker and Temporary Worker sponsors. Use individual sponsor pages to view available licence routes and ratings.`,
    path: basePath,
  });
}

// `searchParams` is intentionally never awaited here - it's forwarded raw to BrowseListPage,
// which forwards it again to the one small Server Component actually wrapped in Suspense. See
// BrowseListPage.tsx: reading (awaiting) it at this level would force this whole route dynamic.
export default async function CityPage({ params, searchParams }: Props) {
  const city = decodeRouteParam((await params).city);
  const [sponsors, meta] = await Promise.all([loadSponsorsByCity(city), loadMetaForFrontend().catch(() => null)]);
  return (
    <BrowseListPage
      kicker="City / town"
      title={`Licensed sponsors in ${city}`}
      sponsors={sponsors}
      searchParamsPromise={searchParams}
      registerDate={meta?.govUkLastUpdated}
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Browse", href: "/browse" },
        { label: city, href: `/browse/city/${encodeURIComponent(city)}` },
      ]}
    />
  );
}
