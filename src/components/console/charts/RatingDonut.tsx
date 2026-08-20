"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";
import { formatNumber } from "@/lib/formatNumber";

const COLORS: Record<string, string> = {
  A: CHART_COLORS.signal,
  B: CHART_COLORS.ember,
  "A & B": "#9aa7b8",
  Unrated: "rgba(154, 167, 184, 0.35)",
};

export function RatingDonut({
  byRating,
  onSliceClick,
}: {
  byRating: Record<string, number>;
  onSliceClick?: (rating: string) => void;
}) {
  const data = ["A", "B", "A & B", "Unrated"]
    .map((name) => ({ name, value: byRating[name] ?? 0 }))
    .filter((d) => d.value > 0);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const aShare = total ? Math.round(((byRating["A"] ?? 0) / total) * 100) : 0;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={82}
            paddingAngle={2}
            stroke="var(--color-void)"
            strokeWidth={2}
            cursor={onSliceClick ? "pointer" : undefined}
            onClick={(entry) => onSliceClick?.((entry as unknown as { name: string }).name)}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={COLORS[d.name]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl text-signal">{aShare}%</span>
        <span className="font-mono text-[10px] uppercase tracking-wide text-mist-dim">A-rated</span>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-mist-dim">
        {data.map((d) => (
          <span key={d.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: COLORS[d.name] }} />
            {d.name} ({formatNumber(d.value)})
          </span>
        ))}
      </div>
    </div>
  );
}
