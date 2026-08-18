"use client";

export function RangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  label,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  label: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between font-mono text-xs text-mist-dim">
        <span>{label}</span>
        <span className="text-signal">
          {valueMin}
          {valueMax > valueMin ? `-${valueMax}` : ""}
        </span>
      </div>
      <div className="relative h-5">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/10" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-signal"
          style={{
            left: `${((valueMin - min) / (max - min)) * 100}%`,
            right: `${100 - ((valueMax - min) / (max - min)) * 100}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={valueMin}
          aria-label={`${label} minimum`}
          onChange={(e) => onChange(Math.min(Number(e.target.value), valueMax), valueMax)}
          className="range-thumb pointer-events-none absolute top-1/2 h-5 w-full -translate-y-1/2 appearance-none bg-transparent"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={valueMax}
          aria-label={`${label} maximum`}
          onChange={(e) => onChange(valueMin, Math.max(Number(e.target.value), valueMin))}
          className="range-thumb pointer-events-none absolute top-1/2 h-5 w-full -translate-y-1/2 appearance-none bg-transparent"
        />
      </div>
      <style jsx>{`
        .range-thumb::-webkit-slider-thumb {
          pointer-events: auto;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: var(--color-signal);
          border: 2px solid var(--color-void);
          cursor: pointer;
        }
        .range-thumb::-moz-range-thumb {
          pointer-events: auto;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: var(--color-signal);
          border: 2px solid var(--color-void);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
