"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS, AXIS_TICK_STYLE } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";

export function LineTrendChart({ data, color = CHART_COLORS.signal }: { data: Array<{ label: string; value: number }>; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK_STYLE} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK_STYLE} width={44} tickFormatter={(v) => Number(v).toLocaleString()} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_COLORS.grid }} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={data.length <= 12} activeDot={{ r: 4 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
