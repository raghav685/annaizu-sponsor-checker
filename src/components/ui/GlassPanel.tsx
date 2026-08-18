import { createElement, type ElementType, type ComponentPropsWithoutRef, type ReactNode } from "react";

type Elevation = "base" | "raised" | "overlay";

const ELEVATION_STYLES: Record<Elevation, string> = {
  base: "bg-slate/70 border-white/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]",
  raised:
    "bg-steel/70 border-white/[0.09] shadow-[0_1px_0_rgba(255,255,255,0.07)_inset,0_20px_50px_-20px_rgba(0,0,0,0.6)]",
  overlay:
    "bg-steel/85 border-white/[0.12] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_30px_80px_-20px_rgba(0,0,0,0.75)]",
};

type GlassPanelProps = {
  as?: ElementType;
  elevation?: Elevation;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"div">, "className" | "children">;

export function GlassPanel({ as = "div", elevation = "base", children, className = "", ...rest }: GlassPanelProps) {
  return createElement(
    as,
    { className: `relative rounded-2xl border backdrop-blur-xl backdrop-saturate-150 ${ELEVATION_STYLES[elevation]} ${className}`, ...rest },
    <span key="noise" aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl glass-noise opacity-[0.03]" />,
    children
  );
}
