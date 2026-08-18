"use client";

import { X } from "@phosphor-icons/react/dist/csr/X";

export function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="group inline-flex items-center gap-1.5 rounded-full border border-signal/30 bg-signal/10 py-1 pl-3 pr-2 font-mono text-xs text-signal transition-transform duration-150 hover:-translate-y-0.5"
    >
      {label}
      <X weight="bold" className="h-3 w-3 opacity-70 group-hover:opacity-100" aria-hidden />
      <span className="sr-only">Remove filter {label}</span>
    </button>
  );
}
