import type { SponsorRatingTier } from "@/types/sponsor";
import { CheckCircle2, TriangleAlert, Hourglass } from "@/lib/icons";

const RATING_STYLES: Record<
  SponsorRatingTier,
  { bg: string; fg: string; Icon: typeof CheckCircle2; label: string }
> = {
  "A rating": {
    bg: "bg-rating-a-soft",
    fg: "text-rating-a",
    Icon: CheckCircle2,
    label: "A rating",
  },
  "A rating (SME+)": {
    bg: "bg-rating-a-soft",
    fg: "text-rating-a",
    Icon: CheckCircle2,
    label: "A rating (SME+)",
  },
  "A rating (Premium)": {
    bg: "bg-rating-a-soft",
    fg: "text-rating-a",
    Icon: CheckCircle2,
    label: "A rating (Premium)",
  },
  "B rating": {
    bg: "bg-rating-b-soft",
    fg: "text-rating-b",
    Icon: TriangleAlert,
    label: "B rating",
  },
  "UK Expansion Worker: Provisional": {
    bg: "bg-rating-provisional-soft",
    fg: "text-rating-provisional",
    Icon: Hourglass,
    label: "Provisional",
  },
};

export function RatingBadge({ tier }: { tier: string }) {
  const style = RATING_STYLES[tier as SponsorRatingTier] ?? {
    bg: "bg-surface",
    fg: "text-ink-muted",
    Icon: CheckCircle2,
    label: tier,
  };
  const { bg, fg, Icon, label } = style;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-[0.8125rem] font-medium ${bg} ${fg}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
