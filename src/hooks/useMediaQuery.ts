"use client";

import { useEffect, useState } from "react";

// SSR-safe: starts false and syncs on mount, matching useReducedMotion's pattern -
// avoids a hydration mismatch since the server can't know the client's viewport.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
