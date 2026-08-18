import type { Metadata } from "next";
import { BrowseListPage } from "@/components/browse/BrowseListPage";
import { loadBrowseIndex, loadSponsorsByCity } from "@/lib/dataQueries";

export const revalidate = 300;

interface Props {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  const { cities } = await loadBrowseIndex();
  return cities.map((c) => ({ city: c.name }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  return {
    title: `Sponsors in ${city}`,
    description: `UK licensed sponsors based in ${city}, from the Home Office register of licensed sponsors.`,
  };
}

export default async function CityPage({ params, searchParams }: Props) {
  const { city } = await params;
  const { page } = await searchParams;
  const sponsors = await loadSponsorsByCity(city);
  return <BrowseListPage kicker="City / town" title={city} sponsors={sponsors} page={Number(page) || 1} />;
}
