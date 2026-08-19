"use client";

import dynamic from "next/dynamic";
import { useSponsorsData } from "@/hooks/useSponsorsData";
import { SmoothScrollProvider } from "./providers/SmoothScrollProvider";
import { FlowFieldBackground } from "./story/FlowFieldBackground";
import { Story } from "./story/Story";
import type { Meta, Stats } from "@/lib/types";

const ParticleField = dynamic(() => import("./story/ParticleField").then((m) => m.ParticleField), { ssr: false });

/** Homepage narrative only - the sponsors console lives at /sponsors. */
export function ExplorerApp({ initialMeta, initialStats }: { initialMeta: Meta | null; initialStats: Stats | null }) {
  // The story only ever needs aggregated stats, never the full per-sponsor
  // list - skip the ~30MB register fetch that /sponsors actually uses. The
  // client fetch still runs (to stay fresh/interactive); initialMeta/initialStats
  // are just what renders before it resolves, so crawlers and first paint see
  // real numbers instead of 0/null.
  useSponsorsData({ loadSponsors: false });

  return (
    <SmoothScrollProvider>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <FlowFieldBackground />
      <ParticleField />
      <Story initialMeta={initialMeta} initialStats={initialStats} />
    </SmoothScrollProvider>
  );
}
