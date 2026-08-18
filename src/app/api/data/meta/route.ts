import { NextResponse } from "next/server";
import { loadMetaForFrontend } from "@/lib/dataQueries";

export const revalidate = 300;

export async function GET() {
  return NextResponse.json(await loadMetaForFrontend());
}
