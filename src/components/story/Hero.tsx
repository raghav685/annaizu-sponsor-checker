"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useExplorerStore } from "@/lib/store";
import { useInView } from "@/hooks/useInView";
import { RevealHeadline } from "./RevealHeadline";
import { AnimatedCounter } from "./AnimatedCounter";

const LicenceField = dynamic(() => import("./LicenceField").then((m) => m.LicenceField), { ssr: false });

export function Hero() {
  const meta = useExplorerStore((s) => s.meta);
  const stats = useExplorerStore((s) => s.globalStats);

  const townCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of stats?.topTowns ?? []) out[t.name] = t.count;
    return out;
  }, [stats]);

  const { ref: sectionRef, inView } = useInView<HTMLElement>();

  return (
    <section ref={sectionRef} className="relative flex min-h-[100dvh] items-center overflow-hidden px-6 pt-16 lg:px-16">
      <div className="absolute inset-0 -z-10">
        {inView && <LicenceField townCounts={townCounts} className="h-full w-full opacity-90" />}
      </div>

      <div className="relative z-content grid w-full max-w-7xl grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="mb-5 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.14em] text-mist-dim">
            <span>UK Sponsors Register</span>
            {meta && (
              <>
                <span aria-hidden className="opacity-40">
                  /
                </span>
                <span className="text-signal">last updated {meta.govUkLastUpdated}</span>
              </>
            )}
          </p>
          <RevealHeadline
            as="h1"
            immediate
            className="font-display text-[clamp(2.5rem,6.5vw,5.5rem)] font-semibold leading-[1.03] text-mist"
          >
            Every company Britain trusts to sponsor a visa.
          </RevealHeadline>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-mist-dim">
            The full Home Office register of licensed sponsors, searchable and live from GOV.UK.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <a
              href="#console"
              className="inline-flex items-center gap-2 rounded-xl border border-signal/40 bg-signal/10 px-5 py-3 font-mono text-sm text-signal transition-transform duration-150 hover:-translate-y-0.5 hover:bg-signal/20"
            >
              Open the console
            </a>
            <div className="font-mono text-sm text-mist-dim">
              <AnimatedCounter value={stats?.totalSponsors ?? 0} className="text-2xl text-mist" /> sponsors
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
