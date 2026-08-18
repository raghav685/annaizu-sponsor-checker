"use client";

import { createElement, useEffect, useRef, type ElementType, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger, SplitText);

export function RevealHeadline({
  as = "h2",
  children,
  className,
  immediate = false,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!ref.current || reduced) return;
    let split: SplitText;
    const ctx = gsap.context(() => {
      split = new SplitText(ref.current!, {
        type: "lines,words",
        linesClass: "split-line-mask",
      });

      gsap.set(split.words, { yPercent: 115, rotationX: -35, opacity: 0 });
      gsap.to(split.words, {
        yPercent: 0,
        rotationX: 0,
        opacity: 1,
        duration: 0.85,
        stagger: 0.02,
        ease: "power3.out",
        delay: immediate ? 0.15 : 0,
        scrollTrigger: immediate
          ? undefined
          : { trigger: ref.current, start: "top 82%", toggleActions: "play none none reverse" },
      });
    }, ref);

    return () => {
      ctx.revert();
      split?.revert();
    };
  }, [reduced, immediate]);

  return createElement(as, { ref, className }, children);
}
