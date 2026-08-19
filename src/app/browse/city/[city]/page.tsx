import type { Metadata } from "next";
import { BrowseListPage } from "@/components/browse/BrowseListPage";
import { loadBrowseIndex, loadSponsorsByCity, loadMetaForFrontend } from "@/lib/dataQueries";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

interface Props {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  const { cities } = await loadBrowseIndex();
  return cities.map((c) => ({ city: c.name }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { city } = await params;
  const { page } = await searchParams;
  const pageNum = Number(page) || 1;
  const basePath = `/browse/city/${encodeURIComponent(city)}`;
  return buildMetadata({
    title: `Licensed UK Visa Sponsors in ${city} | Sponsor List | Annaizu`,
    description: `Browse organisations in ${city} that appear on the current GOV.UK register of licensed Worker and Temporary Worker sponsors. Use individual sponsor pages to view available licence routes and ratings.`,
    path: pageNum > 1 ? `${basePath}?page=${pageNum}` : basePath,
  });
}

export default async function CityPage({ params, searchParams }: Props) {
  const { city } = await params;
  const { page } = await searchParams;
  const [sponsors, meta] = await Promise.all([loadSponsorsByCity(city), loadMetaForFrontend().catch(() => null)]);
  return (
    <BrowseListPage
      kicker="City / town"
      title={`Licensed sponsors in ${city}`}
      sponsors={sponsors}
      page={Number(page) || 1}
      registerDate={meta?.govUkLastUpdated}
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Browse", href: "/browse" },
        { label: city, href: `/browse/city/${encodeURIComponent(city)}` },
      ]}
    />
  );
}
