import { create } from "zustand";
import { DEFAULT_FILTERS, type FilterState } from "./filterState";
import type { Meta, Sponsor, Stats } from "./types";

export interface QueryResult {
  rows: Sponsor[]; // current page only - see /api/data/sponsors
  stats: Stats | null; // aggregate over the FULL filtered set, not just this page
  total: number;
  pageSize: number;
  pageCount: number;
}

export interface Facet {
  name: string;
  count: number;
}

interface ExplorerState {
  filters: FilterState;
  // Any real filter change resets to page 1 - a stale page number past the new result's
  // last page would otherwise silently show "out of range" until the user notices.
  setFilters: (patch: Partial<FilterState>) => void;
  toggleListValue: (key: "regions" | "towns" | "counties" | "routes" | "sectors", value: string) => void;
  resetFilters: () => void;
  // URL -> state hydration only (mount, popstate) - does not touch page, which useUrlSync
  // hydrates separately from its own `p` param.
  hydrateFilters: (filters: FilterState) => void;

  page: number;
  setPage: (page: number) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  meta: Meta | null;
  globalStats: Stats | null;
  setMeta: (meta: Meta) => void;
  setGlobalStats: (stats: Stats) => void;

  townFacets: Facet[];
  countyFacets: Facet[];
  setFacets: (facets: { towns: Facet[]; counties: Facet[] }) => void;

  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  result: QueryResult;
  setResult: (result: QueryResult) => void;
}

const EMPTY_RESULT: QueryResult = { rows: [], stats: null, total: 0, pageSize: 100, pageCount: 1 };

export const useExplorerStore = create<ExplorerState>((set) => ({
  filters: DEFAULT_FILTERS,
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch }, page: 1 })),
  toggleListValue: (key, value) =>
    set((s) => {
      const list = s.filters[key];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { filters: { ...s.filters, [key]: next }, page: 1 };
    }),
  resetFilters: () => set({ filters: DEFAULT_FILTERS, page: 1 }),
  hydrateFilters: (filters) => set({ filters }),

  page: 1,
  setPage: (page) => set({ page }),

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  meta: null,
  globalStats: null,
  setMeta: (meta) => set({ meta }),
  setGlobalStats: (stats) => set({ globalStats: stats }),

  townFacets: [],
  countyFacets: [],
  setFacets: ({ towns, counties }) => set({ townFacets: towns, countyFacets: counties }),

  isLoading: true,
  setIsLoading: (v) => set({ isLoading: v }),
  result: EMPTY_RESULT,
  setResult: (result) => set({ result }),
}));
