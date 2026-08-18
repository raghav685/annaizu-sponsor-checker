import type { ChangelogEvent } from "./dataQueries";

const EVENT_LABEL: Record<string, string> = {
  added: "added to the register",
  removed: "removed from the register",
  rating_changed: "rating changed",
  route_added: "route added",
  route_removed: "route dropped",
  renamed: "renamed",
  relocated: "relocated",
  status_reclassified: "status reclassified",
};

export function eventLabel(eventType: string): string {
  return EVENT_LABEL[eventType] ?? eventType.replace(/_/g, " ");
}

/** Short human-readable detail line for an event row, using its before/after payload. */
export function eventDetail(e: Pick<ChangelogEvent, "eventType" | "route" | "before" | "after">): string {
  const before = (e.before ?? {}) as Record<string, unknown>;
  const after = (e.after ?? {}) as Record<string, unknown>;

  switch (e.eventType) {
    case "rating_changed":
      return `${e.route ?? "route"}: ${(before.rating as string) ?? "Unrated"} → ${(after.rating as string) ?? "Unrated"}`;
    case "route_added":
      return `${e.route ?? (after.route as string) ?? ""}${after.rating ? ` (${after.rating})` : ""}`;
    case "route_removed":
      return `${e.route ?? (before.route as string) ?? ""}`;
    default:
      return "";
  }
}
