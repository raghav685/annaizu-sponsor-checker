const ROUTES = [
  "Skilled Worker",
  "Health and Care Worker",
  "Global Business Mobility",
  "Temporary Worker",
  "Seasonal Worker",
  "Creative Worker",
  "Charity Worker",
  "International Agreement",
  "Religious Worker",
  "Scale-up",
];

export function RouteMarquee() {
  const items = [...ROUTES, ...ROUTES];

  return (
    <div
      aria-hidden="true"
      className="group relative w-full overflow-hidden border-y border-border bg-surface py-4 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]"
    >
      <div className="flex w-max animate-[marquee_38s_linear_infinite] gap-8 group-hover:[animation-play-state:paused]">
        {items.map((route, i) => (
          <span
            key={`${route}-${i}`}
            className="flex items-center gap-8 whitespace-nowrap text-sm font-medium text-ink-muted"
          >
            {route}
            <span className="text-border-strong">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
