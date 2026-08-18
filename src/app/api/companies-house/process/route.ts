import { NextRequest, NextResponse } from "next/server";
import { processCompaniesHouseQueue } from "@/lib/companiesHouse/processQueue";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const NO_INDEX_HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

// Same auth pattern as /api/sync/trigger. Vercel Hobby's cron only supports
// once-daily schedules, which is far too infrequent for a rate-limited queue
// that wants to run every few minutes - see docs/data-pipeline.md for the
// external-scheduler alternative (cron-job.org, GitHub Actions, etc. hitting
// this route with the same bearer token).
async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on the server." }, { status: 500, headers: NO_INDEX_HEADERS });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_INDEX_HEADERS });
  }
  if (!process.env.COMPANIES_HOUSE_API_KEY) {
    return NextResponse.json({ error: "COMPANIES_HOUSE_API_KEY is not configured." }, { status: 500, headers: NO_INDEX_HEADERS });
  }

  const result = await processCompaniesHouseQueue(50);
  return NextResponse.json(result, { headers: NO_INDEX_HEADERS });
}

export const GET = handle;
export const POST = handle;
