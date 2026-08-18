"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS, AXIS_TICK_STYLE } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";

export function RoutesHistogram({
  histogram,
  active,
  onBarClick,
}: {
  histogram: Record<string, number>;
  active?: number;
  onBarClick?: (routeCount: number) => void;
}) {
  const data = Object.entries(histogram)
    .map(([k, v]) => ({ routes: Number(k), count: v }))
    .sort((a, b) => a.routes - b.routes);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="routes"
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK_STYLE}
          tickFormatter={(v) => `${v}`}
        />
        <YAxis hide />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART_COLORS.grid }} />
        <Bar
          dataKey="count"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          cursor={onBarClick ? "pointer" : undefined}
          onClick={(entry) => onBarClick?.((entry as unknown as { routes: number }).routes)}
        >
          {data.map((d) => (
            <Cell key={d.routes} fill={active === d.routes ? CHART_COLORS.signal : CHART_COLORS.signalDim} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
