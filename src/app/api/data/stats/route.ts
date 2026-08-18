import { NextResponse } from "next/server";
import { loadActiveSponsorsForFrontend, buildStatsFromSponsors } from "@/lib/dataQueries";

export const revalidate = 300;

export async function GET() {
  const sponsorsList = await loadActiveSponsorsForFrontend();
  return NextResponse.json(buildStatsFromSponsors(sponsorsList));
}
