"use client";

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useExplorerStore } from "@/lib/store";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { RevealHeadline } from "./RevealHeadline";
import type { Stats } from "@/lib/types";
import { formatNumber } from "@/lib/formatNumber";

gsap.registerPlugin(ScrollTrigger);

export function RoutesRatingsSection({ initialStats }: { initialStats: Stats | null }) {
  const stats = useExplorerStore((s) => s.globalStats) ?? initialStats;
  const reduced = useReducedMotion();
  const barsRef = useRef<HTMLDivElement>(null);

  const routes = useMemo(() => {
    const entries = Object.entries(stats?.byRoute ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = entries[0]?.[1] ?? 1;
    return entries.map(([name, count]) => ({ name, count, share: count / max }));
  }, [stats]);

  useEffect(() => {
    if (!barsRef.current || reduced) return;
    const fills = gsap.utils.toArray<HTMLElement>(".route-fill", barsRef.current);
    const ctx = gsap.context(() => {
      fills.forEach((fill) => {
        gsap.set(fill, { scaleX: 0 });
        gsap.to(fill, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: fill, start: "top 85%", end: "top 45%", scrub: 0.5 },
        });
      });
    }, barsRef);
    return () => ctx.revert();
  }, [reduced, routes.length]);

  if (!stats) return null;
  const aShare = Math.round(((stats.byRating["A"] ?? 0) / stats.totalSponsors) * 100);

  return (
    <section className="relative mx-auto grid min-h-[90dvh] max-w-6xl grid-cols-1 items-center gap-16 px-6 py-24 lg:grid-cols-2 lg:px-0">
      <div>
        <RevealHeadline as="h2" className="font-display text-[clamp(2rem,4.5vw,3.6rem)] font-semibold leading-tight text-mist">
          Almost everyone comes in through one route.
        </RevealHeadline>
        <p className="mt-6 max-w-md text-base leading-relaxed text-mist-dim">
          <span className="text-signal">{aShare}%</span> of sponsors hold an A rating. Skilled Worker dwarfs every
          other route on the register combined.
        </p>
      </div>
      <div ref={barsRef} className="space-y-4">
        {routes.map((r) => (
          <div key={r.name}>
            <div className="mb-1.5 flex items-baseline justify-between font-mono text-xs text-mist-dim">
              <span className="truncate pr-2">{r.name}</span>
              <span className="shrink-0 text-signal">{formatNumber(r.count)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="route-fill h-full origin-left rounded-full bg-signal"
                style={{ width: `${Math.max(r.share * 100, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
