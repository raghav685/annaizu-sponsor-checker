"use client";

import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

export function useLowPowerDevice(): boolean {
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    const cores = navigator.hardwareConcurrency ?? 8;
    const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;
    setLowPower(cores <= 4 || memory <= 4);
  }, []);

  return lowPower;
}
