import type { Metadata } from "next";
import { BrowseListPage } from "@/components/browse/BrowseListPage";
import { loadBrowseIndex, loadSponsorsByRoute, loadMetaForFrontend } from "@/lib/dataQueries";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

interface Props {
  params: Promise<{ route: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  const { routes } = await loadBrowseIndex();
  return routes.map((r) => ({ route: r.name }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { route } = await params;
  const { page } = await searchParams;
  const pageNum = Number(page) || 1;
  const basePath = `/browse/route/${encodeURIComponent(route)}`;
  return buildMetadata({
    title: `UK Sponsors on the ${route} Route | Sponsor List | Annaizu`,
    description: `UK organisations licensed to sponsor visas on the ${route} route, from the current GOV.UK register of licensed sponsors.`,
    path: pageNum > 1 ? `${basePath}?page=${pageNum}` : basePath,
  });
}

export default async function RoutePage({ params, searchParams }: Props) {
  const { route } = await params;
  const { page } = await searchParams;
  const [sponsors, meta] = await Promise.all([loadSponsorsByRoute(route), loadMetaForFrontend().catch(() => null)]);
  return (
    <BrowseListPage
      kicker="Visa route"
      title={`Licensed sponsors on the ${route} route`}
      sponsors={sponsors}
      page={Number(page) || 1}
      registerDate={meta?.govUkLastUpdated}
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Browse", href: "/browse" },
        { label: route, href: `/browse/route/${encodeURIComponent(route)}` },
      ]}
    />
  );
}
