import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrowseListPage } from "@/components/browse/BrowseListPage";
import { loadSponsorsBySector } from "@/lib/dataQueries";
import { ALL_SECTORS, SECTOR_BY_SLUG } from "@/lib/constants";
import { slugify } from "@/lib/slug";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  return ALL_SECTORS.map((s) => ({ slug: slugify(s) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sector = SECTOR_BY_SLUG[slug];
  if (!sector) return { title: "Industry not found" };
  return {
    title: `${sector} sponsors`,
    description: `UK licensed sponsors in the ${sector} industry (inferred from organisation name), from the Home Office register.`,
  };
}

export default async function IndustryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page } = await searchParams;
  const sector = SECTOR_BY_SLUG[slug];
  if (!sector) notFound();
  const sponsors = await loadSponsorsBySector(sector);
  return <BrowseListPage kicker="Industry (inferred)" title={sector} sponsors={sponsors} page={Number(page) || 1} />;
}
