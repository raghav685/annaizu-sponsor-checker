"use client";

import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SponsorTableHeader, SponsorTableRow } from "./SponsorTableRow";
import type { Sponsor } from "@/lib/types";

export function RemovedSponsorsPanel() {
  const [state, setState] = useState<{ loading: boolean; sponsors: Sponsor[]; error: boolean }>({
    loading: true,
    sponsors: [],
    error: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/data/sponsors/removed")
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data: Sponsor[]) => {
        if (!cancelled) setState({ loading: false, sponsors: data, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, sponsors: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) {
    return <p className="p-6 text-center font-mono text-xs text-mist-dim">Loading…</p>;
  }
  if (state.error) {
    return <p className="p-6 text-center font-mono text-xs text-ember">Couldn&apos;t load revoked sponsors - try again.</p>;
  }

  return (
    <GlassPanel elevation="base" className="flex h-full flex-col overflow-hidden">
      <SponsorTableHeader />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {state.sponsors.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <p className="max-w-sm font-mono text-xs text-mist-dim">
              No sponsors have been removed from the register since this site began tracking it. Removals will appear here as soon
              as they&apos;re observed in a publish.
            </p>
          </div>
        ) : (
          state.sponsors.map((s) => <SponsorTableRow key={s.id} sponsor={s} height={56} />)
        )}
      </div>
    </GlassPanel>
  );
}
