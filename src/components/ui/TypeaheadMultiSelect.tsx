"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Chip } from "./Chip";

interface Option {
  name: string;
  count: number;
}

export function TypeaheadMultiSelect({
  label,
  options,
  selected,
  onToggle,
  placeholder,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
    return base.slice(0, 30);
  }, [options, query]);

  return (
    <div className="relative">
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <Chip key={s} label={s} onRemove={() => onToggle(s)} />
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && filtered[activeIndex]) {
            e.preventDefault();
            onToggle(filtered[activeIndex].name);
            setQuery("");
          } else if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-sm text-mist placeholder:text-mist-dim/60 focus-visible:border-signal/50"
      />
      {open && filtered.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-white/10 bg-steel/95 backdrop-blur-xl p-1 shadow-xl"
        >
          {filtered.map((opt, i) => {
            const isSelected = selected.includes(opt.name);
            return (
              <li
                key={opt.name}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onToggle(opt.name);
                  setQuery("");
                }}
                className={`flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-sm ${
                  i === activeIndex ? "bg-signal/15 text-signal" : "text-mist hover:bg-white/5"
                } ${isSelected ? "font-medium" : ""}`}
              >
                <span className="truncate">{opt.name}</span>
                <span className="font-mono text-[11px] text-mist-dim">{opt.count.toLocaleString()}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
