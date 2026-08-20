"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { formatNumber } from "@/lib/formatNumber";

export function AnimatedCounter({
  value,
  className,
  suffix = "",
  triggerOnMount = true,
}: {
  value: number;
  className?: string;
  suffix?: string;
  triggerOnMount?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !triggerOnMount) return;
    if (reduced || value === 0) {
      el.textContent = formatNumber(value) + suffix;
      return;
    }
    const counter = { n: 0 };
    const tween = gsap.to(counter, {
      n: value,
      duration: 1.6,
      ease: "power2.out",
      onUpdate: () => {
        if (el) el.textContent = formatNumber(Math.round(counter.n)) + suffix;
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, reduced, suffix, triggerOnMount]);

  // Static markup shows the real final value, not "0" - a crawler or anyone
  // without JS must see the actual number. The count-up animation (above)
  // still runs for real users on mount, purely as a visual flourish; it
  // doesn't depend on what this initial text was.
  return (
    <span ref={ref} className={className}>
      {formatNumber(value)}
      {suffix}
    </span>
  );
}
