"use client";

import { ChevronLeft, ChevronRight } from "@/lib/icons";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const items = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-border text-ink disabled:opacity-40 hover:border-border-strong disabled:hover:border-border"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      {items.map((p, i) => {
        const prev = items[i - 1];
        const showEllipsis = prev !== undefined && p - prev > 1;
        return (
          <span key={p} className="flex items-center gap-1.5">
            {showEllipsis && <span className="px-1 text-ink-muted">…</span>}
            <button
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-sm tabular font-medium ${
                p === page
                  ? "bg-brand text-on-brand"
                  : "text-ink hover:bg-surface border border-border"
              }`}
            >
              {p}
            </button>
          </span>
        );
      })}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-border text-ink disabled:opacity-40 hover:border-border-strong disabled:hover:border-border"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
