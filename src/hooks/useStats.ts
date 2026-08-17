"use client";

import { useEffect, useState } from "react";

export interface RegisterStats {
  totalSponsors: number;
  generatedAt: string;
  sourceUrl: string;
  sourcePublicationUrl: string;
  isSample: boolean;
}

export function useStats() {
  const [stats, setStats] = useState<RegisterStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data: RegisterStats) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
