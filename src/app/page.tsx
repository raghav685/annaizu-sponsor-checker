import { ExplorerApp } from "@/components/ExplorerApp";
import { loadMetaForFrontend, loadKpiSummary, loadPublishTrend, type KpiSummary, type PublishTrendPoint } from "@/lib/dataQueries";

export const revalidate = 300;

export default async function Home() {
  let meta = null;
  let kpi: KpiSummary | null = null;
  let trend: PublishTrendPoint[] = [];
  try {
    [meta, kpi, trend] = await Promise.all([loadMetaForFrontend(), loadKpiSummary(), loadPublishTrend()]);
  } catch (err) {
    console.error("Failed to load meta/KPI/trend for homepage", err);
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
        distribution: { "@type": "DataDownload", contentUrl: meta.csvUrl, encodingFormat: "text/csv" },
        dateModified: meta.pipelineRunAt,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <ExplorerApp kpi={kpi} trend={trend} />
    </>
  );
}
