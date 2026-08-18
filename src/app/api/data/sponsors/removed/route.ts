import { NextResponse } from "next/server";
import { loadRemovedSponsorsForFrontend } from "@/lib/dataQueries";

// Small/empty result today (no removals recorded yet) - cached on the same cadence as the
// active list rather than the default no-cache, since it's driven by the same sync cycle.
export const revalidate = 300;

export async function GET() {
  const removed = await loadRemovedSponsorsForFrontend();
  return NextResponse.json(removed);
}
