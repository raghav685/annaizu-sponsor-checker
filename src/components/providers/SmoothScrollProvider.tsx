"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({
      lerp: 0.08,
      duration: 1.2,
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    // GSAP's ticker reports time in SECONDS; Lenis.raf() expects MILLISECONDS
    // (like requestAnimationFrame's timestamp) - without the *1000 conversion,
    // Lenis computes a near-zero delta between frames and the scroll animation
    // never progresses, which reads as "the page won't scroll".
    function raf(time: number) {
      lenis.raf(time * 1000);
    }
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [reduced]);

  return <>{children}</>;
}
