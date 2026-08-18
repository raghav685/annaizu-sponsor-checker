"use client";

import dynamic from "next/dynamic";
import { useSponsorsData } from "@/hooks/useSponsorsData";
import { useUrlSync } from "@/hooks/useUrlSync";
import { SmoothScrollProvider } from "./providers/SmoothScrollProvider";
import { FlowFieldBackground } from "./story/FlowFieldBackground";
import { Story } from "./story/Story";
import { ConsoleShell } from "./console/ConsoleShell";
import { Footer } from "./Footer";
import type { KpiSummary, PublishTrendPoint } from "@/lib/dataQueries";

const ParticleField = dynamic(() => import("./story/ParticleField").then((m) => m.ParticleField), { ssr: false });

export function ExplorerApp({ kpi, trend }: { kpi: KpiSummary | null; trend: PublishTrendPoint[] }) {
  useSponsorsData();
  useUrlSync();

  return (
    <SmoothScrollProvider>
      <a href="#console" className="skip-link">
        Skip to console
      </a>
      <FlowFieldBackground />
      <ParticleField />
      <Story />
      <ConsoleShell kpi={kpi} trend={trend} />
      <Footer />
    </SmoothScrollProvider>
  );
}
