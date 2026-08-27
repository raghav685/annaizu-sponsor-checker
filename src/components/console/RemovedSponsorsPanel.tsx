"use client";

import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { TABLE_MIN_WIDTH_CLASS, SponsorTableHeader, SponsorTableRow, SponsorCard, CARD_HEIGHT, ROW_HEIGHTS } from "./SponsorTableRow";
import { PaginationBar } from "./PaginationBar";
import type { Sponsor } from "@/lib/types";

const CARD_BREAKPOINT = "(max-width: 767px)";

interface State {
  loading: boolean;
  rows: Sponsor[];
  total: number;
  pageSize: number;
  pageCount: number;
  error: boolean;
}

const EMPTY_STATE: State = { loading: true, rows: [], total: 0, pageSize: 100, pageCount: 1, error: false };

export function RemovedSponsorsPanel() {
  const [page, setPage] = useState(1);
  const [state, setState] = useState<State>(EMPTY_STATE);
  const isCardMode = useMediaQuery(CARD_BREAKPOINT);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fetch(`/api/data/sponsors/removed?page=${page}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json() as Promise<{ rows: Sponsor[]; total: number; pageSize: number; pageCount: number }>;
      })
      .then((data) => {
        if (!cancelled) setState({ loading: false, rows: data.rows, total: data.total, pageSize: data.pageSize, pageCount: data.pageCount, error: false });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  if (state.loading && state.rows.length === 0) {
    return <p className="p-6 text-center font-mono text-xs text-mist-dim">Loading…</p>;
  }
  if (state.error) {
    return <p className="p-6 text-center font-mono text-xs text-ember">Couldn&apos;t load suspended sponsors - try again.</p>;
  }

  return (
    <GlassPanel elevation="base" className="flex h-full flex-col overflow-hidden">
      <div className={isCardMode ? "flex min-h-0 flex-1 flex-col" : "flex min-h-0 flex-1 flex-col overflow-x-auto"}>
        {!isCardMode && <SponsorTableHeader />}
        <div className={`min-h-0 flex-1 overflow-y-auto ${isCardMode ? "w-full" : TABLE_MIN_WIDTH_CLASS}`} aria-busy={state.loading}>
          {state.rows.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <p className="max-w-sm font-mono text-xs text-mist-dim">
                No sponsors are currently suspended. This means observed leaving the register - it isn&apos;t a confirmed claim about why
                (could be a genuine licence loss, a voluntary surrender, or a rename/relocation that looks identical in the data).
              </p>
            </div>
          ) : isCardMode ? (
            state.rows.map((s) => <SponsorCard key={s.id} sponsor={s} height={CARD_HEIGHT} />)
          ) : (
            state.rows.map((s) => <SponsorTableRow key={s.id} sponsor={s} height={ROW_HEIGHTS.comfortable} />)
          )}
        </div>
      </div>
      <PaginationBar page={page} pageCount={state.pageCount} pageSize={state.pageSize} total={state.total} onPageChange={setPage} />
    </GlassPanel>
  );
}
