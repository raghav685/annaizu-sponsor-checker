"use client";

import { useEffect, useState } from "react";

export interface Facets {
  townCities: string[];
  counties: string[];
  routes: string[];
  ratingTiers: string[];
  types: string[];
}

export function useFacets() {
  const [facets, setFacets] = useState<Facets | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/facets")
      .then((res) => res.json())
      .then((data: Facets) => {
        if (!cancelled) setFacets(data);
      })
      .catch(() => {
        if (!cancelled) setFacets(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return facets;
}
