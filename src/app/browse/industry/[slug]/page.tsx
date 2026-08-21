import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrowseListPage } from "@/components/browse/BrowseListPage";
import { loadSponsorsBySector, loadMetaForFrontend } from "@/lib/dataQueries";
import { ALL_SECTORS, SECTOR_BY_SLUG } from "@/lib/constants";
import { slugify } from "@/lib/slug";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  return ALL_SECTORS.map((s) => ({ slug: slugify(s) }));
}

// Deliberately does not read `searchParams` - see BrowseListPage.tsx for why. Every paginated
// view canonicalises to this same base path.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sector = SECTOR_BY_SLUG[slug];
  if (!sector) return { title: "Industry not found", robots: { index: false, follow: true } };
  const basePath = `/browse/industry/${slug}`;
  return buildMetadata({
    title: `Licensed UK Sponsors in ${sector} | Sponsor List | Annaizu`,
    description: `Browse organisations in the ${sector} industry (inferred from organisation name) that appear on the current GOV.UK register of licensed Worker and Temporary Worker sponsors.`,
    path: basePath,
  });
}

// `searchParams` is intentionally never awaited here - see BrowseListPage.tsx.
export default async function IndustryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sector = SECTOR_BY_SLUG[slug];
  if (!sector) notFound();
  const [sponsors, meta] = await Promise.all([loadSponsorsBySector(sector), loadMetaForFrontend().catch(() => null)]);
  return (
    <BrowseListPage
      kicker="Industry (inferred)"
      title={`Licensed sponsors in ${sector} (inferred)`}
      sponsors={sponsors}
      searchParamsPromise={searchParams}
      registerDate={meta?.govUkLastUpdated}
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Browse", href: "/browse" },
        { label: sector, href: `/browse/industry/${slug}` },
      ]}
    />
  );
}
