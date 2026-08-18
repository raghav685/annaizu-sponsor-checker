"use client";

import { useExplorerStore } from "@/lib/store";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { AnimatedCounter } from "./AnimatedCounter";
import { ALL_REGIONS } from "@/lib/constants";

function Stat({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  return (
    <div ref={ref}>
      <div className="font-display text-[clamp(1.6rem,4.8vw,4rem)] font-semibold leading-none text-mist">
        {inView ? <AnimatedCounter value={value} suffix={suffix} /> : "0" + suffix}
      </div>
      <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-mist-dim">{label}</p>
    </div>
  );
}

export function ScaleSection() {
  const stats = useExplorerStore((s) => s.globalStats);
  if (!stats) return null;

  const regionsCovered = ALL_REGIONS.filter((r) => r !== "Unknown" && (stats.byRegion[r] ?? 0) > 0).length;
  const routesCount = Object.keys(stats.byRoute).length;
  const aShare = Math.round(((stats.byRating["A"] ?? 0) / stats.totalSponsors) * 100);

  return (
    <section className="relative mx-auto grid min-h-[90dvh] max-w-6xl grid-cols-2 items-center gap-x-10 gap-y-14 px-6 py-24 sm:grid-cols-3 lg:grid-cols-5 lg:px-0">
      <Stat label="Sponsors on the register" value={stats.totalSponsors} />
      <Stat label="Licences held" value={stats.totalLicences} />
      <Stat label="UK regions covered" value={regionsCovered} />
      <Stat label="Visa routes" value={routesCount} />
      <Stat label="A-rated share" value={aShare} suffix="%" />
    </section>
  );
}
