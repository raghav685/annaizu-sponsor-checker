import type { ReactNode } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";

export function ChartCard({
  title,
  shown,
  total,
  children,
  footnote,
}: {
  title: string;
  shown: number;
  total: number;
  children: ReactNode;
  footnote?: string;
}) {
  return (
    <GlassPanel elevation="base" className="flex flex-col p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-sm text-mist">{title}</h3>
        <span className="shrink-0 font-mono text-[10.5px] text-mist-dim">
          {shown.toLocaleString()} of {total.toLocaleString()}
        </span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
      {footnote && <p className="mt-2 font-mono text-[10px] text-mist-dim/70">{footnote}</p>}
    </GlassPanel>
  );
}
