import type { Metadata } from "next";
import { BrowseListPage } from "@/components/browse/BrowseListPage";
import { loadBrowseIndex, loadSponsorsByRoute } from "@/lib/dataQueries";

export const revalidate = 300;

interface Props {
  params: Promise<{ route: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  const { routes } = await loadBrowseIndex();
  return routes.map((r) => ({ route: r.name }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { route } = await params;
  return {
    title: `${route} sponsors`,
    description: `UK organisations licensed to sponsor visas on the ${route} route, from the Home Office register.`,
  };
}

export default async function RoutePage({ params, searchParams }: Props) {
  const { route } = await params;
  const { page } = await searchParams;
  const sponsors = await loadSponsorsByRoute(route);
  return <BrowseListPage kicker="Visa route" title={route} sponsors={sponsors} page={Number(page) || 1} />;
}
