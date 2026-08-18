import type { Rating, SponsorType } from "@/lib/types";

export function RatingBadge({ rating }: { rating: Rating }) {
  const isA = rating === "A";
  const isBoth = rating === "A & B";
  const color = rating === "B" ? "text-ember border-ember/40 bg-ember/10" : isA || isBoth ? "text-signal border-signal/40 bg-signal/10" : "text-mist-dim border-white/10 bg-white/5";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] tracking-wide ${color}`}
    >
      {rating === "Unrated" ? "UNRATED" : rating}
    </span>
  );
}

export function SponsorTypeTag({ type }: { type: SponsorType }) {
  const label = type === "Both" ? "Worker + Temporary" : type;
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wide text-mist-dim">
      {label}
    </span>
  );
}

export function RoutePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-mist-dim">
      {label}
    </span>
  );
}
