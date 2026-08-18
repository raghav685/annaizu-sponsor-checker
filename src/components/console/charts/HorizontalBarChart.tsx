"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS, AXIS_TICK_STYLE } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";

export function HorizontalBarChart({
  data,
  onBarClick,
  selected = [],
}: {
  data: Array<{ name: string; count: number }>;
  onBarClick?: (name: string) => void;
  selected?: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 26)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 0 }} barCategoryGap={6}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tickLine={false}
          axisLine={false}
          tick={{ ...AXIS_TICK_STYLE }}
          interval={0}
        />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
          cursor={onBarClick ? "pointer" : undefined}
          onClick={(entry) => onBarClick?.((entry as unknown as { name: string }).name)}
          label={{ position: "right", fill: CHART_COLORS.axisText, fontSize: 11, fontFamily: "var(--font-mono)" }}
        >
          {data.map((d) => (
            <Cell
              key={d.name}
              fill={selected.length === 0 || selected.includes(d.name) ? CHART_COLORS.signal : CHART_COLORS.signalDim}
            />
          ))}
        </Bar>
        <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART_COLORS.grid }} />
      </BarChart>
    </ResponsiveContainer>
  );
}
