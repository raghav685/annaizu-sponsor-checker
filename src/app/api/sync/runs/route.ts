import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { syncRuns } from "@/db/schema";

export async function GET() {
  const runs = await db.query.syncRuns.findMany({
    orderBy: [desc(syncRuns.startedAt)],
    limit: 50,
  });
  return NextResponse.json({ runs });
}
