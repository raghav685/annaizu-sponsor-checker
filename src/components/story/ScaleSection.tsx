"use client";

import { useExplorerStore } from "@/lib/store";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { AnimatedCounter } from "./AnimatedCounter";
import { ALL_REGIONS } from "@/lib/constants";
import type { Stats } from "@/lib/types";

function Stat({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  return (
    // Sized to content (not an equal-width grid column) so a short value like
    // "12" doesn't leave a wide dead zone before the next stat - the gap
    // between numbers stays the same fixed width regardless of digit count.
    <div ref={ref} className="min-w-[7ch] basis-[calc(50%-1.5rem)] sm:basis-[calc(33.333%-2rem)] lg:basis-auto">
      <div className="font-display text-[clamp(1.6rem,4.8vw,4rem)] font-semibold leading-none text-mist">
        {inView ? <AnimatedCounter value={value} suffix={suffix} /> : "0" + suffix}
      </div>
      <p className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-mist-dim">{label}</p>
    </div>
  );
}

export function ScaleSection({ initialStats }: { initialStats: Stats | null }) {
  const stats = useExplorerStore((s) => s.globalStats) ?? initialStats;
  if (!stats) return null;

  const regionsCovered = ALL_REGIONS.filter((r) => r !== "Unknown" && (stats.byRegion[r] ?? 0) > 0).length;
  const routesCount = Object.keys(stats.byRoute).length;
  const aShare = Math.round(((stats.byRating["A"] ?? 0) / stats.totalSponsors) * 100);

  return (
    <section className="relative mx-auto flex min-h-[90dvh] max-w-6xl flex-wrap items-start gap-x-12 gap-y-12 px-6 py-24 lg:px-0">
      <Stat label="Sponsors on the register" value={stats.totalSponsors} />
      <Stat label="Licences held" value={stats.totalLicences} />
      <Stat label="UK regions covered" value={regionsCovered} />
      <Stat label="Visa routes" value={routesCount} />
      <Stat label="A-rated share" value={aShare} suffix="%" />
    </section>
  );
}
