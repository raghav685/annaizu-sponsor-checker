import { NextResponse } from "next/server";
import { getFacets } from "@/lib/sponsors";

export async function GET() {
  return NextResponse.json(getFacets());
}
