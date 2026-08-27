"use client";

import { useEffect, useRef } from "react";
import { useExplorerStore } from "@/lib/store";
import { filtersToParams } from "@/lib/filterState";
import type { QueryResult } from "@/lib/store";

const DEBOUNCE_MS = 150;

/**
 * Server-side replacement for the old client-side filter worker (see sponsorFilter.ts /
 * /api/data/sponsors) - fetches exactly one page of already-filtered/sorted results per
 * (filters, page, status) change instead of loading the whole register into the browser once
 * and re-filtering it locally. `status` narrows to the currently active console tab
 * ("active" or "suspended" - see ConsoleShell's STATUS_TABS); omit for "both".
 */
export function useSponsorsQuery(status?: "active" | "suspended") {
  const filters = useExplorerStore((s) => s.filters);
  const page = useExplorerStore((s) => s.page);
  const setResult = useExplorerStore((s) => s.setResult);
  const setIsLoading = useExplorerStore((s) => s.setIsLoading);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setIsLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;

      const params = filtersToParams(filters);
      params.set("page", String(page));
      if (status) params.set("status", status);

      fetch(`/api/data/sponsors?${params.toString()}`, { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw new Error(`Request failed (${r.status})`);
          return r.json() as Promise<{
            rows: QueryResult["rows"];
            stats: QueryResult["stats"];
            total: number;
            pageSize: number;
            pageCount: number;
          }>;
        })
        .then((data) => {
          if (requestId !== requestIdRef.current) return; // superseded by a newer request
          setResult({ rows: data.rows, stats: data.stats, total: data.total, pageSize: data.pageSize, pageCount: data.pageCount });
          setIsLoading(false);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          console.error("Failed to load sponsors", err);
          if (requestId === requestIdRef.current) setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, status]);
}
