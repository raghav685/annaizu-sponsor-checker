import type { Metadata } from "next";
import { SponsorsConsole } from "@/components/SponsorsConsole";
import { loadKpiSummary, loadPublishTrend, type KpiSummary, type PublishTrendPoint } from "@/lib/dataQueries";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Search UK Licensed Sponsors | Annaizu Sponsor Checker",
  description:
    "Search and filter every active or removed UK sponsor licence by region, route and rating, synced daily from the GOV.UK register of licensed sponsors.",
  path: "/sponsors",
});

export default async function SponsorsPage() {
  let kpi: KpiSummary | null = null;
  let trend: PublishTrendPoint[] = [];
  try {
    [kpi, trend] = await Promise.all([loadKpiSummary(), loadPublishTrend()]);
  } catch (err) {
    console.error("Failed to load KPI/trend for /sponsors", err);
  }

  return <SponsorsConsole kpi={kpi} trend={trend} />;
}
