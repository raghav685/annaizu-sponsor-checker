export function SponsorCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-surface-raised p-5"
    >
      <div className="h-5 w-3/4 animate-pulse rounded bg-surface" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-surface" />
      <div className="flex gap-1.5">
        <div className="h-6 w-20 animate-pulse rounded-[var(--radius-sm)] bg-surface" />
      </div>
      <div className="flex gap-1.5 border-t border-border pt-3">
        <div className="h-6 w-24 animate-pulse rounded-full bg-surface" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-surface" />
      </div>
    </div>
  );
}
