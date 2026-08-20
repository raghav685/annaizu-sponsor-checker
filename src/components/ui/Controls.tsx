"use client";

import type { ReactNode } from "react";
import { formatNumber } from "@/lib/formatNumber";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5 font-mono text-xs"
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt)}
            className={`rounded-md px-2.5 py-1.5 transition-colors duration-150 ${
              active ? "bg-signal text-void" : "text-mist-dim hover:text-mist"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-sm text-mist">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ${
          checked ? "bg-signal" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-void transition-transform duration-150 ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export function CheckboxRow({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-white/[0.04]">
      <span className="flex items-center gap-2 truncate">
        <span
          aria-hidden
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            checked ? "border-signal bg-signal" : "border-white/20 bg-transparent"
          }`}
        >
          {checked && (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-none stroke-void stroke-[2.5]">
              <path d="M2 6.5 5 9.5 10 3" />
            </svg>
          )}
        </span>
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <span className="truncate text-mist">{label}</span>
      </span>
      {typeof count === "number" && (
        <span className="font-mono text-[11px] text-mist-dim">{formatNumber(count)}</span>
      )}
    </label>
  );
}

export function FieldsetGroup({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="border-t border-hairline pt-4 first:border-t-0 first:pt-0">
      <legend className="mb-2 font-mono text-[11px] uppercase tracking-wide text-mist-dim">{legend}</legend>
      {children}
    </fieldset>
  );
}
