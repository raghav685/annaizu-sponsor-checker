import { NextRequest, NextResponse } from "next/server";
import { loadRecentEvents } from "@/lib/dataQueries";

const PAGE_SIZE = 40;

export async function GET(req: NextRequest) {
  const offsetParam = req.nextUrl.searchParams.get("offset");
  const offset = Math.max(0, Number(offsetParam ?? 0) || 0);
  const data = await loadRecentEvents(PAGE_SIZE, offset);
  return NextResponse.json(data);
}
