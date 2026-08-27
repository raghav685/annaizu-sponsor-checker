"use client";

import { useEffect, useRef, useState } from "react";
import { useExplorerStore } from "@/lib/store";
import { filtersToParams, paramsToFilters, type FilterState } from "@/lib/filterState";

const PAGE_PARAM = "p";

function paramsEqual(a: URLSearchParams, b: URLSearchParams): boolean {
  return a.toString() === b.toString();
}

function buildParams(filters: FilterState, page: number): URLSearchParams {
  const params = filtersToParams(filters);
  if (page > 1) params.set(PAGE_PARAM, String(page));
  return params;
}

function readPage(params: URLSearchParams): number {
  const raw = params.get(PAGE_PARAM);
  const n = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function useUrlSync() {
  const filters = useExplorerStore((s) => s.filters);
  const page = useExplorerStore((s) => s.page);
  const hydrateFilters = useExplorerStore((s) => s.hydrateFilters);
  const setPage = useExplorerStore((s) => s.setPage);
  const prevFiltersRef = useRef<FilterState | null>(null);
  const prevPageRef = useRef<number | null>(null);
  // A real render flag, not just a ref: the sync-to-URL effect below must not read `filters`/
  // `page` until the render that reflects hydrateFilters/setPage's store updates has actually
  // happened, or it closes over pre-hydration defaults and briefly clobbers a deep-linked URL
  // (region=London&p=3) with the empty default state before the hydrated re-render lands.
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from URL on mount, and on manual back/forward navigation.
  useEffect(() => {
    const hydrate = () => {
      const params = new URLSearchParams(window.location.search);
      hydrateFilters(paramsToFilters(params));
      setPage(readPage(params));
      setHydrated(true);
    };
    hydrate();
    window.addEventListener("popstate", hydrate);
    return () => window.removeEventListener("popstate", hydrate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect filter/page state changes into the URL.
  useEffect(() => {
    if (!hydrated) return;
    const nextParams = buildParams(filters, page);
    const currentParams = new URLSearchParams(window.location.search);
    if (paramsEqual(nextParams, currentParams)) {
      prevFiltersRef.current = filters;
      prevPageRef.current = page;
      return;
    }

    const prevFilters = prevFiltersRef.current;
    const prevPage = prevPageRef.current;
    const filtersChanged =
      prevFilters !== null &&
      (Object.keys(filters) as Array<keyof FilterState>).some((k) => JSON.stringify(prevFilters[k]) !== JSON.stringify(filters[k]));
    const onlySearchChanged =
      prevFilters !== null &&
      prevFilters.search !== filters.search &&
      (Object.keys(filters) as Array<keyof FilterState>).every(
        (k) => k === "search" || JSON.stringify(prevFilters[k]) === JSON.stringify(filters[k])
      );
    // A pure page change (pager click, filters untouched) gets its own history entry so
    // back/forward moves between result pages, same as it already does for filter changes.
    const onlyPageChanged = prevFilters !== null && !filtersChanged && prevPage !== null && prevPage !== page;

    const url = `${window.location.pathname}${nextParams.toString() ? `?${nextParams}` : ""}`;
    if ((onlySearchChanged && !onlyPageChanged) || prevFilters === null) {
      window.history.replaceState(window.history.state, "", url);
    } else {
      window.history.pushState(window.history.state, "", url);
    }
    prevFiltersRef.current = filters;
    prevPageRef.current = page;
  }, [filters, page, hydrated]);
}
