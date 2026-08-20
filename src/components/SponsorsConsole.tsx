"use client";

import { useSponsorsData } from "@/hooks/useSponsorsData";
import { useUrlSync } from "@/hooks/useUrlSync";
import { ConsoleShell } from "./console/ConsoleShell";
import type { KpiSummary } from "@/lib/dataQueries";

export function SponsorsConsole({ kpi }: { kpi: KpiSummary | null }) {
  useSponsorsData();
  useUrlSync();

  return <ConsoleShell kpi={kpi} />;
}
