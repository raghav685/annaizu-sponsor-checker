"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

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
      el.textContent = value.toLocaleString() + suffix;
      return;
    }
    const counter = { n: 0 };
    const tween = gsap.to(counter, {
      n: value,
      duration: 1.6,
      ease: "power2.out",
      onUpdate: () => {
        if (el) el.textContent = Math.round(counter.n).toLocaleString() + suffix;
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, reduced, suffix, triggerOnMount]);

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  );
}
