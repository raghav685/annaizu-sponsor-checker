import type { Metadata } from "next";
import { SponsorsConsole } from "@/components/SponsorsConsole";
import { loadKpiSummary, type KpiSummary } from "@/lib/dataQueries";
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
  try {
    kpi = await loadKpiSummary();
  } catch (err) {
    console.error("Failed to load KPI for /sponsors", err);
  }

  return <SponsorsConsole kpi={kpi} />;
}
