/** Matches scripts/lib/text.ts's slugify - kept dependency-free so both /src and /scripts can use it without a cross-boundary import. */
export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Dynamic segments containing a space (a real town like "Milton Keynes" or a route like
 * "Charity Worker") were reaching the DB query still percent-encoded on Vercel's fallback
 * render path for a static param not served from the pre-built HTML - confirmed against
 * production: `/browse/city/Milton%20Keynes` 404'd (loadSponsorsByCity found zero rows for
 * "Milton%20Keynes") despite the town genuinely existing and being linked from `/browse`.
 * Decoding defensively here means the page works regardless of whether the platform already
 * decoded it - `decodeURIComponent` on an already-decoded string ("Milton Keynes") is a no-op.
 */
export function decodeRouteParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
