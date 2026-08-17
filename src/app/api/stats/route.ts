import { NextResponse } from "next/server";
import { getStats } from "@/lib/sponsors";

export async function GET() {
  return NextResponse.json(getStats());
}
