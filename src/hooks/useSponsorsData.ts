"use client";

import { useEffect, useState } from "react";
import { useExplorerStore } from "@/lib/store";
import type { Meta, Sponsor, Stats } from "@/lib/types";

function idle(cb: () => void) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb);
  } else {
    setTimeout(cb, 200);
  }
}

export function useSponsorsData({ loadSponsors = true }: { loadSponsors?: boolean } = {}) {
  const setMeta = useExplorerStore((s) => s.setMeta);
  const setGlobalStats = useExplorerStore((s) => s.setGlobalStats);
  const setSponsors = useExplorerStore((s) => s.setSponsors);
  const [heavyDataLoaded, setHeavyDataLoaded] = useState(false);

  useEffect(() => {
    // Small, needed for the story-mode narrative numbers - fetch immediately.
    Promise.all([
      fetch("/api/data/meta").then((r) => r.json() as Promise<Meta>),
      fetch("/api/data/stats").then((r) => r.json() as Promise<Stats>),
    ])
      .then(([meta, stats]) => {
        setMeta(meta);
        setGlobalStats(stats);
      })
      .catch((err) => console.error("Failed to load meta/stats", err));

    // The full register (~30MB) is never shipped in the first paint, and pages
    // that never render a per-sponsor list (the homepage story) skip it entirely.
    if (!loadSponsors) return;
    idle(() => {
      fetch("/api/data/sponsors")
        .then((r) => r.json() as Promise<Sponsor[]>)
        .then((sponsors) => {
          setSponsors(sponsors);
          setHeavyDataLoaded(true);
        })
        .catch((err) => console.error("Failed to load sponsors", err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSponsors]);

  return { heavyDataLoaded };
}
