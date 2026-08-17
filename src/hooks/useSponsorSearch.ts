"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SponsorSearchResult } from "@/lib/sponsors";

function subscribeToNothing() {
  return () => {};
}

function getUrlSearch() {
  return window.location.search;
}

function getServerUrlSearch() {
  return "";
}

export interface SponsorFilters {
  q: string;
  townCity: string;
  county: string;
  types: string[];
  ratingTiers: string[];
  routes: string[];
}

export const EMPTY_FILTERS: SponsorFilters = {
  q: "",
  townCity: "",
  county: "",
  types: [],
  ratingTiers: [],
  routes: [],
};

const PAGE_SIZE = 12;
const DEBOUNCE_MS = 250;

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function filtersFromSearchParams(params: URLSearchParams): {
  filters: SponsorFilters;
  page: number;
} {
  return {
    filters: {
      q: params.get("q") ?? "",
      townCity: params.get("townCity") ?? "",
      county: params.get("county") ?? "",
      types: parseList(params.get("types")),
      ratingTiers: parseList(params.get("ratingTiers")),
      routes: parseList(params.get("routes")),
    },
    page: Number(params.get("page")) || 1,
  };
}

function buildQuery(filters: SponsorFilters, page: number, includePageSize: boolean): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.townCity) params.set("townCity", filters.townCity);
  if (filters.county) params.set("county", filters.county);
  if (filters.types.length) params.set("types", filters.types.join(","));
  if (filters.ratingTiers.length) params.set("ratingTiers", filters.ratingTiers.join(","));
  if (filters.routes.length) params.set("routes", filters.routes.join(","));
  if (page > 1) params.set("page", String(page));
  if (includePageSize) params.set("pageSize", String(PAGE_SIZE));
  return params.toString();
}

export function useSponsorSearch() {
  const router = useRouter();
  const pathname = usePathname();

  // `getServerUrlSearch` ("") is used for both the server render and the
  // first client (hydration) render, so they always match — the page never
  // needs to wait on `useSearchParams()`, which forces Next.js to defer this
  // whole subtree behind a streamed Suspense boundary that only reveals once
  // requestAnimationFrame fires. rAF is suspended in backgrounded tabs, so
  // that boundary would otherwise leave the entire page hidden and
  // non-interactive until it's foregrounded. Once hydrated, React reruns the
  // render with the real `window.location.search`, and the block below
  // adopts it into local state synchronously, before this render commits.
  const urlSearch = useSyncExternalStore(subscribeToNothing, getUrlSearch, getServerUrlSearch);

  const [syncedUrlSearch, setSyncedUrlSearch] = useState(urlSearch);
  const [filters, setFilters] = useState<SponsorFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SponsorSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  if (urlSearch !== syncedUrlSearch) {
    const { filters: urlFilters, page: urlPage } = filtersFromSearchParams(
      new URLSearchParams(urlSearch),
    );
    setSyncedUrlSearch(urlSearch);
    setFilters(urlFilters);
    setPage(urlPage);
  }

  const activeFilterCount = useMemo(
    () =>
      (filters.q ? 1 : 0) +
      (filters.townCity ? 1 : 0) +
      (filters.county ? 1 : 0) +
      filters.types.length +
      filters.ratingTiers.length +
      filters.routes.length,
    [filters],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const requestId = ++requestIdRef.current;
    const loadingFrame = requestAnimationFrame(() => setLoading(true));

    debounceRef.current = setTimeout(async () => {
      const urlQuery = buildQuery(filters, page, false);
      router.replace(urlQuery ? `${pathname}?${urlQuery}` : pathname, { scroll: false });

      try {
        const res = await fetch(`/api/sponsors?${buildQuery(filters, page, true)}`);
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data: SponsorSearchResult = await res.json();
        if (requestId === requestIdRef.current) {
          setResult(data);
          setError(null);
        }
      } catch {
        if (requestId === requestIdRef.current) {
          setError("Couldn't load results. Check your connection and try again.");
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelAnimationFrame(loadingFrame);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, retryNonce]);

  const updateFilters = useCallback((patch: Partial<SponsorFilters>) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const removeFilterValue = useCallback(
    (key: "types" | "ratingTiers" | "routes", value: string) => {
      setPage(1);
      setFilters((prev) => ({ ...prev, [key]: prev[key].filter((v) => v !== value) }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setPage(1);
    setFilters(EMPTY_FILTERS);
  }, []);

  const retry = useCallback(() => setRetryNonce((n) => n + 1), []);

  return {
    filters,
    updateFilters,
    removeFilterValue,
    clearFilters,
    activeFilterCount,
    page,
    setPage,
    result,
    loading,
    error,
    retry,
  };
}
