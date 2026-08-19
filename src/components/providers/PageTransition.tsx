"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Wraps route content so navigating between pages (e.g. `/` -> `/sponsors`)
 * gets a short fade/rise instead of an instant, jarring swap. Keyed off
 * pathname rather than a template.tsx per-route file so it's one shared
 * implementation for every route.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!ref.current || reduced) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
    }, ref);
    return () => ctx.revert();
  }, [pathname, reduced]);

  return <div ref={ref}>{children}</div>;
}
