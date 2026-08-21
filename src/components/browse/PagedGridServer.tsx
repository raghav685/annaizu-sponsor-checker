import { SponsorPageGrid } from "./SponsorPageGrid";
import type { Sponsor } from "@/lib/types";

// Plain (not "use client") Server Component - the only piece of the page that reads
// `searchParams`, isolated inside a Suspense boundary in BrowseListPage.tsx. Renders fully on
// the server, so the ~60-item page it slices out is all that ever crosses the network - no
// need to ship the full (sometimes 40,000+ row) sponsor array to a client bundle just to read
// `?page=`. An earlier version of this fix used a "use client" component that took the whole
// array as a prop; that broke exactly the largest routes (e.g. "Skilled Worker") by forcing
// the entire list to serialize into the RSC payload. This version has no such cost regardless
// of how large the underlying list is.
export async function PagedGridServer({
  sorted,
  searchParamsPromise,
}: {
  sorted: Sponsor[];
  searchParamsPromise: Promise<{ page?: string }>;
}) {
  const { page } = await searchParamsPromise;
  return <SponsorPageGrid sorted={sorted} page={Number(page) || 1} />;
}
