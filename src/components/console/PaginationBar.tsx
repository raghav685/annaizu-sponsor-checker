"use client";

import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { formatNumber } from "@/lib/formatNumber";

interface PaginationBarProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

const BUTTON_CLASS =
  "inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-mono text-xs text-mist transition-colors hover:border-signal/40 hover:text-signal disabled:pointer-events-none disabled:opacity-40";

export function PaginationBar({ page, pageCount, pageSize, total, onPageChange }: PaginationBarProps) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-hairline px-5 py-3">
      <p className="font-mono text-xs text-mist-dim">
        {formatNumber(start)}–{formatNumber(end)} of {formatNumber(total)}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={BUTTON_CLASS} aria-label="Previous page">
          <CaretLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <span className="font-mono text-xs text-mist-dim">
          Page {formatNumber(page)} of {formatNumber(pageCount)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className={BUTTON_CLASS}
          aria-label="Next page"
        >
          Next
          <CaretRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
