"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useStats } from "@/hooks/useStats";
import { useSponsorSearchContext } from "@/context/SponsorSearchContext";
import { formatSponsorDate } from "@/lib/format";
import { AnimatedCounter } from "./AnimatedCounter";
import { RouteMarquee } from "./RouteMarquee";
import { Magnetic } from "./Magnetic";
import { Search, ArrowRight } from "@/lib/icons";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const stats = useStats();
  const { filters, updateFilters } = useSponsorSearchContext();
  const prefersReducedMotion = useReducedMotion();

  const scrollToChecker = () => {
    document.getElementById("checker")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const reveal = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: EASE_OUT_EXPO },
        };

  return (
    <section className="flex flex-col items-center gap-10 pb-16 pt-16 md:pt-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-5 text-center md:px-8">
        <motion.p
          {...reveal(0)}
          className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-ink-muted"
        >
          Sourced directly from the UK Home Office&apos;s public register
        </motion.p>

        <motion.h1
          {...reveal(0.08)}
          className="font-display text-[clamp(2.25rem,4vw+1rem,3.75rem)] font-semibold text-ink"
        >
          Check if a UK employer really holds a{" "}
          <span className="text-brand">sponsor licence</span>
        </motion.h1>

        <motion.p {...reveal(0.16)} className="prose-measure text-lg text-ink-muted">
          A sponsor licence is Home Office permission for an employer to hire
          workers from outside the UK on a visa. Annaizu searches the
          government&apos;s own published register so you can check any UK
          organisation in seconds — no downloads, no jargon.
        </motion.p>

        <motion.form
          {...reveal(0.24)}
          onSubmit={(e) => {
            e.preventDefault();
            scrollToChecker();
          }}
          className="mt-2 flex w-full max-w-xl flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              inputMode="search"
              value={filters.q}
              onChange={(e) => updateFilters({ q: e.target.value })}
              placeholder="Search by organisation name…"
              aria-label="Search by organisation name"
              className="h-14 w-full rounded-[var(--radius-md)] border border-border bg-surface-raised pl-11 pr-4 text-base text-ink shadow-[0_1px_2px_rgb(0_0_0_/_0.04)] placeholder:text-ink-muted focus-visible:border-brand"
            />
          </div>
          <Magnetic>
            <button
              type="submit"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-brand px-6 font-medium text-on-brand hover:bg-brand-strong sm:w-auto"
            >
              Search the register
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </Magnetic>
        </motion.form>

        <motion.div
          {...reveal(0.32)}
          className="mt-2 flex flex-col items-center gap-1 text-ink-muted"
        >
          <p className="font-display text-4xl font-semibold text-ink">
            <AnimatedCounter target={stats?.totalSponsors ?? 0} />
          </p>
          <p className="text-sm">
            licensed sponsors currently on the register
            {stats?.generatedAt && <> · updated {formatSponsorDate(stats.generatedAt)}</>}
          </p>
        </motion.div>
      </div>

      <RouteMarquee />
    </section>
  );
}
