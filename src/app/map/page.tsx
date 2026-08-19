import type { Metadata } from "next";
import { CoverageMap } from "@/components/map/CoverageMap";
import { loadTownCoverage } from "@/lib/dataQueries";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "UK Sponsor Licence Map | Licensed Sponsors by Location | Annaizu",
  description: "Explore how licensed UK sponsors are distributed across locations, using the current GOV.UK register of licensed sponsors.",
  path: "/map",
});

export default async function MapPage() {
  const rows = await loadTownCoverage();

  return (
    <main className="relative min-h-[100dvh] bg-void px-6 py-12 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-2xl font-semibold text-mist lg:text-3xl">UK sponsor licence map</h1>
        <p className="mt-2 font-mono text-sm text-mist-dim">
          Explore how licensed sponsors are distributed across UK locations, using the current register data. Filter
          by region or inferred industry - the field and the list below both update. Only towns in a curated
          ~100-place gazetteer get their own node; every place still counts toward totals. Density here reflects
          registered sponsors, not current job availability.
        </p>

        <div className="mt-6">
          <CoverageMap rows={rows} />
        </div>
      </div>
    </main>
  );
}
