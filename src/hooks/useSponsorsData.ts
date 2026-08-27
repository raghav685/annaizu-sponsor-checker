"use client";

import { useEffect } from "react";
import { useExplorerStore } from "@/lib/store";
import type { Meta, Stats } from "@/lib/types";

/** Meta/stats only - dataset-wide, small, needed on every page that shows KPI/story numbers.
 *  The per-sponsor list itself is fetched separately and paginated - see useSponsorsQuery. */
export function useSponsorsData() {
  const setMeta = useExplorerStore((s) => s.setMeta);
  const setGlobalStats = useExplorerStore((s) => s.setGlobalStats);

  useEffect(() => {
    Promise.all([
      fetch("/api/data/meta").then((r) => r.json() as Promise<Meta>),
      fetch("/api/data/stats").then((r) => r.json() as Promise<Stats>),
    ])
      .then(([meta, stats]) => {
        setMeta(meta);
        setGlobalStats(stats);
      })
      .catch((err) => console.error("Failed to load meta/stats", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
