"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useExplorerStore } from "@/lib/store";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useInView } from "@/hooks/useInView";
import { RevealHeadline } from "./RevealHeadline";

gsap.registerPlugin(ScrollTrigger);

const LicenceField = dynamic(() => import("./LicenceField").then((m) => m.LicenceField), { ssr: false });

export function GeographySection() {
  const stats = useExplorerStore((s) => s.globalStats);
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);

  const townCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of stats?.topTowns ?? []) out[t.name] = t.count;
    return out;
  }, [stats]);

  const regions = useMemo(
    () =>
      Object.entries(stats?.byRegion ?? {})
        .filter(([name]) => name !== "Unknown")
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
    [stats]
  );

  useEffect(() => {
    if (!listRef.current || reduced) return;
    const rows = gsap.utils.toArray<HTMLElement>(".geo-row", listRef.current);
    const ctx = gsap.context(() => {
      gsap.set(rows, { opacity: 0.15, x: -16 });
      gsap.to(rows, {
        opacity: 1,
        x: 0,
        stagger: 0.15,
        ease: "none",
        scrollTrigger: {
          trigger: listRef.current,
          start: "top 75%",
          end: "bottom 60%",
          scrub: 0.6,
        },
      });
    }, listRef);
    return () => ctx.revert();
  }, [reduced, regions.length]);

  const { ref: sectionRef, inView } = useInView<HTMLElement>();

  return (
    <section ref={sectionRef} className="relative flex min-h-[100dvh] items-center overflow-hidden px-6 py-24 lg:px-16">
      <div className="absolute inset-0 -z-10 opacity-70">
        {inView && <LicenceField townCounts={townCounts} className="h-full w-full" />}
      </div>
      <div className="relative z-content grid w-full max-w-6xl grid-cols-1 gap-12 lg:grid-cols-2">
        <RevealHeadline as="h2" className="font-display text-[clamp(2rem,4.5vw,3.6rem)] font-semibold leading-tight text-mist">
          Sponsors cluster where the work is.
        </RevealHeadline>
        <div ref={listRef} className="space-y-4 border-t border-hairline pt-4 font-mono text-sm">
          {regions.map(([name, count]) => (
            <div key={name} className="geo-row flex items-center justify-between">
              <span className="text-mist">{name}</span>
              <span className="text-signal">{count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
