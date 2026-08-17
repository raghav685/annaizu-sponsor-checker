"use client";

import { createContext, useContext } from "react";
import { useSponsorSearch } from "@/hooks/useSponsorSearch";
import { useFacets } from "@/hooks/useFacets";

type SponsorSearchContextValue = ReturnType<typeof useSponsorSearch> & {
  facets: ReturnType<typeof useFacets>;
};

const SponsorSearchContext = createContext<SponsorSearchContextValue | null>(null);

export function SponsorSearchProvider({ children }: { children: React.ReactNode }) {
  const search = useSponsorSearch();
  const facets = useFacets();

  return (
    <SponsorSearchContext.Provider value={{ ...search, facets }}>
      {children}
    </SponsorSearchContext.Provider>
  );
}

export function useSponsorSearchContext() {
  const ctx = useContext(SponsorSearchContext);
  if (!ctx) {
    throw new Error("useSponsorSearchContext must be used within a SponsorSearchProvider");
  }
  return ctx;
}
