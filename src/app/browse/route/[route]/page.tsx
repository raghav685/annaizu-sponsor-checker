import type { Metadata } from "next";
import { BrowseListPage } from "@/components/browse/BrowseListPage";
import { loadBrowseIndex, loadSponsorsByRoute, loadMetaForFrontend } from "@/lib/dataQueries";
import { buildMetadata } from "@/lib/seo";
import { decodeRouteParam } from "@/lib/slug";

export const revalidate = 300;

interface Props {
  params: Promise<{ route: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  const { routes } = await loadBrowseIndex();
  return routes.map((r) => ({ route: r.name }));
}

// Deliberately does not read `searchParams` - see BrowseListPage.tsx for why. Every paginated
// view canonicalises to this same base path.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = decodeRouteParam((await params).route);
  const basePath = `/browse/route/${encodeURIComponent(route)}`;
  return buildMetadata({
    title: `UK Sponsors on the ${route} Route | Sponsor List | Annaizu`,
    description: `UK organisations licensed to sponsor visas on the ${route} route, from the current GOV.UK register of licensed sponsors.`,
    path: basePath,
  });
}

// `searchParams` is intentionally never awaited here - see BrowseListPage.tsx.
export default async function RoutePage({ params, searchParams }: Props) {
  const route = decodeRouteParam((await params).route);
  const [sponsors, meta] = await Promise.all([loadSponsorsByRoute(route), loadMetaForFrontend().catch(() => null)]);
  return (
    <BrowseListPage
      kicker="Visa route"
      title={`Licensed sponsors on the ${route} route`}
      sponsors={sponsors}
      searchParamsPromise={searchParams}
      registerDate={meta?.govUkLastUpdated}
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Browse", href: "/browse" },
        { label: route, href: `/browse/route/${encodeURIComponent(route)}` },
      ]}
    />
  );
}
