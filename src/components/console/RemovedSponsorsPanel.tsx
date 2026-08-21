"use client";

import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { TABLE_MIN_WIDTH_CLASS, SponsorTableHeader, SponsorTableRow, SponsorCard, CARD_HEIGHT, ROW_HEIGHTS } from "./SponsorTableRow";
import type { Sponsor } from "@/lib/types";

const CARD_BREAKPOINT = "(max-width: 767px)";

export function RemovedSponsorsPanel() {
  const [state, setState] = useState<{ loading: boolean; sponsors: Sponsor[]; error: boolean }>({
    loading: true,
    sponsors: [],
    error: false,
  });
  const isCardMode = useMediaQuery(CARD_BREAKPOINT);

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
    return <p className="p-6 text-center font-mono text-xs text-ember">Couldn&apos;t load removed sponsors - try again.</p>;
  }

  return (
    <GlassPanel elevation="base" className="flex h-full flex-col overflow-hidden">
      <div className={isCardMode ? "flex min-h-0 flex-1 flex-col" : "flex min-h-0 flex-1 flex-col overflow-x-auto"}>
        {!isCardMode && <SponsorTableHeader />}
        <div className={`min-h-0 flex-1 overflow-y-auto ${isCardMode ? "w-full" : TABLE_MIN_WIDTH_CLASS}`}>
          {state.sponsors.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <p className="max-w-sm font-mono text-xs text-mist-dim">
                No sponsors have been removed from the register. This means observed leaving the register - it isn&apos;t a confirmed claim about why
                (could be a genuine licence loss, a voluntary surrender, or a rename/relocation that looks identical in the data).
              </p>
            </div>
          ) : isCardMode ? (
            state.sponsors.map((s) => <SponsorCard key={s.id} sponsor={s} height={CARD_HEIGHT} />)
          ) : (
            state.sponsors.map((s) => <SponsorTableRow key={s.id} sponsor={s} height={ROW_HEIGHTS.comfortable} />)
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
