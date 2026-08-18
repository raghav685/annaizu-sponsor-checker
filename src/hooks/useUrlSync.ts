"use client";

import { useEffect, useRef } from "react";
import { useExplorerStore } from "@/lib/store";
import { filtersToParams, paramsToFilters, type FilterState } from "@/lib/filterState";

function paramsEqual(a: URLSearchParams, b: URLSearchParams): boolean {
  return a.toString() === b.toString();
}

export function useUrlSync() {
  const filters = useExplorerStore((s) => s.filters);
  const hydrateFilters = useExplorerStore((s) => s.hydrateFilters);
  const prevFiltersRef = useRef<FilterState | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate from URL on mount, and on manual back/forward navigation.
  useEffect(() => {
    const hydrate = () => {
      const params = new URLSearchParams(window.location.search);
      hydrateFilters(paramsToFilters(params));
    };
    hydrate();
    hydratedRef.current = true;
    window.addEventListener("popstate", hydrate);
    return () => window.removeEventListener("popstate", hydrate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect filter state changes into the URL.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const nextParams = filtersToParams(filters);
    const currentParams = new URLSearchParams(window.location.search);
    if (paramsEqual(nextParams, currentParams)) return;

    const prev = prevFiltersRef.current;
    const onlySearchChanged =
      prev !== null &&
      prev.search !== filters.search &&
      (Object.keys(filters) as Array<keyof FilterState>).every(
        (k) => k === "search" || JSON.stringify(prev[k]) === JSON.stringify(filters[k])
      );

    const url = `${window.location.pathname}${nextParams.toString() ? `?${nextParams}` : ""}`;
    if (onlySearchChanged || prev === null) {
      window.history.replaceState(window.history.state, "", url);
    } else {
      window.history.pushState(window.history.state, "", url);
    }
    prevFiltersRef.current = filters;
  }, [filters]);
}
