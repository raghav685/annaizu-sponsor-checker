"use client";

import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SponsorTableHeader, SponsorTableRow } from "./SponsorTableRow";
import type { Sponsor } from "@/lib/types";

const EMPTY_MESSAGE: Record<Exclude<Sponsor["status"], "active">, string> = {
  withdrawn:
    "No sponsors are currently classified as withdrawn. This bucket means Companies House confirms the organisation is still trading, so the register removal reason (surrender, non-renewal, a rename, or a relocation) isn't known.",
  closed:
    "No sponsors are currently classified as closed. This bucket only includes organisations Companies House confirms have been dissolved, gone into liquidation, or similar - a fact about the company itself, not a claim about why it left the register.",
  unknown:
    "No sponsors are currently unclassified. This bucket is for organisations observed leaving the register that haven't been checked against Companies House yet.",
};

export function RemovedSponsorsPanel({ status }: { status: Exclude<Sponsor["status"], "active"> }) {
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
    return <p className="p-6 text-center font-mono text-xs text-ember">Couldn&apos;t load removed sponsors - try again.</p>;
  }

  const filtered = state.sponsors.filter((s) => s.status === status);

  return (
    <GlassPanel elevation="base" className="flex h-full flex-col overflow-hidden">
      <SponsorTableHeader />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <p className="max-w-sm font-mono text-xs text-mist-dim">{EMPTY_MESSAGE[status]}</p>
          </div>
        ) : (
          filtered.map((s) => <SponsorTableRow key={s.id} sponsor={s} height={56} />)
        )}
      </div>
    </GlassPanel>
  );
}
