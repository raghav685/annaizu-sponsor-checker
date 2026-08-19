import type { Metadata } from "next";
import { ExplorerApp } from "@/components/ExplorerApp";
import { loadMetaForFrontend, loadActiveSponsorsForFrontend, buildStatsFromSponsors } from "@/lib/dataQueries";
import { SITE_URL } from "@/lib/site";
import { buildMetadata } from "@/lib/seo";
import type { Meta, Stats } from "@/lib/types";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "UK Sponsor Licence Checker | Search Licensed Sponsors | Annaizu",
  description:
    "Search the UK register of licensed Worker and Temporary Worker sponsors. Filter employers by location, route and licence rating using the Annaizu sponsor checker.",
  path: "/",
});

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "annaizu Sponsor Checker",
  description: "Search the UK Home Office register of licensed visa sponsors, synced daily from GOV.UK.",
  url: SITE_URL,
  publisher: { "@type": "Organization", name: "annaizu", url: "https://www.annaizu.com/" },
};

export default async function Home() {
  let meta: Meta | null = null;
  let stats: Stats | null = null;
  try {
    // Computed once per revalidate window (this page already has revalidate = 300),
    // not per-request - cheap enough to make the story-mode numbers real in the
    // server-rendered HTML instead of a client-only fetch that starts at 0/null.
    const [metaResult, sponsorsResult] = await Promise.all([loadMetaForFrontend(), loadActiveSponsorsForFrontend()]);
    meta = metaResult;
    stats = buildStatsFromSponsors(sponsorsResult);
  } catch (err) {
    console.error("Failed to load meta/stats for homepage", err);
  }

  const jsonLd = meta
    ? {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: "UK Register of Licensed Sponsors",
        description:
          "Home Office register of organisations licensed to sponsor Skilled Worker and other UK visas.",
        url: meta.sourceUrl,
        license: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
        creator: { "@type": "Organization", name: "UK Home Office / UK Visas and Immigration" },
        publisher: { "@type": "Organization", name: "annaizu", url: "https://www.annaizu.com/" },
        distribution: { "@type": "DataDownload", contentUrl: meta.csvUrl, encodingFormat: "text/csv" },
        dateModified: meta.pipelineRunAt,
      }
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }} />
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <ExplorerApp initialMeta={meta} initialStats={stats} />
    </>
  );
}
