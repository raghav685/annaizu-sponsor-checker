import { NextRequest, NextResponse } from "next/server";
import { searchSponsors } from "@/lib/sponsors";

function parseList(value: string | null): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const result = searchSponsors({
    q: params.get("q") ?? undefined,
    townCity: params.get("townCity") ?? undefined,
    county: params.get("county") ?? undefined,
    types: parseList(params.get("types")),
    ratingTiers: parseList(params.get("ratingTiers")),
    routes: parseList(params.get("routes")),
    page: params.get("page") ? Number(params.get("page")) : undefined,
    pageSize: params.get("pageSize") ? Number(params.get("pageSize")) : undefined,
  });

  return NextResponse.json(result);
}
