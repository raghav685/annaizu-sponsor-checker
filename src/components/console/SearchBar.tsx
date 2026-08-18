"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useExplorerStore } from "@/lib/store";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { List } from "@phosphor-icons/react/dist/csr/List";

export function SearchBar() {
  const filters = useExplorerStore((s) => s.filters);
  const setFilters = useExplorerStore((s) => s.setFilters);
  const resultIds = useExplorerStore((s) => s.result.ids);
  const sponsorsById = useExplorerStore((s) => s.sponsorsById);
  const setSidebarOpen = useExplorerStore((s) => s.setSidebarOpen);
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = ["INPUT", "TEXTAREA"].includes(target.tagName);
      if ((e.key === "/" && !isTyping) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const suggestions =
    filters.search.trim() && sponsorsById
      ? resultIds
          .slice(0, 8)
          .map((id) => sponsorsById.get(id))
          .filter((s): s is NonNullable<typeof s> => Boolean(s))
      : [];

  return (
    <div className="relative flex-1">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open filters"
          className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-mist-dim lg:hidden"
        >
          <List className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-dim" />
          <input
            ref={inputRef}
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            placeholder="Search by organisation name..."
            aria-label="Search sponsor organisations"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-4 pl-11 pr-16 font-mono text-sm text-mist placeholder:text-mist-dim/60 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] backdrop-blur-xl focus-visible:border-signal/50"
          />
          <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-mist-dim/70">
            /
          </kbd>
          {suggestOpen && suggestions.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-steel/95 backdrop-blur-xl shadow-2xl"
            >
              {suggestions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/sponsor/${s.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-mist hover:bg-white/5"
                  >
                    <span className="truncate">
                      {s.name} <span className="text-mist-dim">· {s.town}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-mist-dim">
                      {s.routeCount} route{s.routeCount === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
