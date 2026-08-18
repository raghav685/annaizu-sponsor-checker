import type { Metadata } from "next";
import { CoverageMap } from "@/components/map/CoverageMap";
import { loadTownCoverage } from "@/lib/dataQueries";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sponsor coverage map",
  description: "Where UK licensed sponsors are concentrated, by region and inferred industry.",
};

export default async function MapPage() {
  const rows = await loadTownCoverage();

  return (
    <main className="relative min-h-[100dvh] bg-void px-6 py-12 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-2xl font-semibold text-mist lg:text-3xl">Sponsor coverage map</h1>
        <p className="mt-2 font-mono text-sm text-mist-dim">
          Where active sponsors are concentrated across the UK. Filter by region or inferred industry - the field and the list below
          both update. Only towns in a curated ~100-place gazetteer get their own node; every place still counts toward totals.
        </p>

        <div className="mt-6">
          <CoverageMap rows={rows} />
        </div>
      </div>
    </main>
  );
}
