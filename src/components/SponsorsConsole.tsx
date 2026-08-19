"use client";

import { useSponsorsData } from "@/hooks/useSponsorsData";
import { useUrlSync } from "@/hooks/useUrlSync";
import { ConsoleShell } from "./console/ConsoleShell";
import type { KpiSummary, PublishTrendPoint } from "@/lib/dataQueries";

export function SponsorsConsole({ kpi, trend }: { kpi: KpiSummary | null; trend: PublishTrendPoint[] }) {
  useSponsorsData();
  useUrlSync();

  return <ConsoleShell kpi={kpi} trend={trend} />;
}
