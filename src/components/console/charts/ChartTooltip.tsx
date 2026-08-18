interface TooltipEntry {
  name?: string;
  value?: number | string;
  dataKey?: string | number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-steel/95 px-3 py-2 font-mono text-xs text-mist shadow-xl backdrop-blur-xl">
      {label !== undefined && <p className="mb-1 text-mist-dim">{label}</p>}
      {payload.map((entry, i) => (
        <p key={entry.dataKey?.toString() ?? i} className="text-mist">
          {entry.name}: <span className="text-signal">{Number(entry.value).toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}
