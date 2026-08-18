import { create } from "zustand";
import { DEFAULT_FILTERS, type FilterState } from "./filterState";
import type { Meta, Sponsor, Stats } from "./types";

interface FilteredResult {
  ids: string[];
  stats: Stats | null;
}

interface ExplorerState {
  filters: FilterState;
  setFilters: (patch: Partial<FilterState>) => void;
  toggleListValue: (key: "regions" | "towns" | "counties" | "routes" | "sectors", value: string) => void;
  resetFilters: () => void;
  hydrateFilters: (filters: FilterState) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  meta: Meta | null;
  globalStats: Stats | null;
  sponsors: Sponsor[] | null;
  sponsorsById: Map<string, Sponsor> | null;
  setMeta: (meta: Meta) => void;
  setGlobalStats: (stats: Stats) => void;
  setSponsors: (sponsors: Sponsor[]) => void;

  isFiltering: boolean;
  result: FilteredResult;
  setResult: (result: FilteredResult) => void;
  setIsFiltering: (v: boolean) => void;
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  filters: DEFAULT_FILTERS,
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  toggleListValue: (key, value) =>
    set((s) => {
      const list = s.filters[key];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { filters: { ...s.filters, [key]: next } };
    }),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  hydrateFilters: (filters) => set({ filters }),

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  meta: null,
  globalStats: null,
  sponsors: null,
  sponsorsById: null,
  setMeta: (meta) => set({ meta }),
  setGlobalStats: (stats) => set({ globalStats: stats }),
  setSponsors: (sponsors) =>
    set({ sponsors, sponsorsById: new Map(sponsors.map((s) => [s.id, s])) }),

  isFiltering: false,
  result: { ids: [], stats: null },
  setResult: (result) => set({ result }),
  setIsFiltering: (v) => set({ isFiltering: v }),
}));

export function getSponsorById(id: string): Sponsor | undefined {
  return useExplorerStore.getState().sponsorsById?.get(id);
}
