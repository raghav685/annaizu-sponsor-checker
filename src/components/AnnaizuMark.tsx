/**
 * Placeholder brand mark. Swap this SVG (and the --color-brand* tokens in
 * globals.css) for a real logo/palette later — nothing else references
 * the shape directly.
 */
export function AnnaizuMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-brand" />
      <path
        d="M9 17.5L13.5 22L23 11"
        stroke="var(--color-on-brand)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AnnaizuWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <AnnaizuMark />
      <span className="font-display text-lg font-semibold tracking-tight text-ink">
        Annaizu
      </span>
    </span>
  );
}
