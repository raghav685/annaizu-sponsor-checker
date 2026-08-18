/** Matches scripts/lib/text.ts's slugify - kept dependency-free so both /src and /scripts can use it without a cross-boundary import. */
export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
