import { NextRequest, NextResponse } from "next/server";
import Fuse from "fuse.js";
import { loadActiveSponsorsForFrontend } from "@/lib/dataQueries";
import type { Sponsor } from "@/lib/types";

// One bulk check shouldn't force a fresh 127k-row hydrate + Fuse index build on every
// request - reuse the warm index across requests within the same server instance,
// same 5-minute cadence as the rest of the site's revalidate windows.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { fuse: Fuse<Sponsor>; builtAt: number } | null = null;

async function getFuseIndex(): Promise<Fuse<Sponsor>> {
  if (cached && Date.now() - cached.builtAt < CACHE_TTL_MS) return cached.fuse;
  const sponsors = await loadActiveSponsorsForFrontend();
  const fuse = new Fuse(sponsors, { keys: ["name"], threshold: 0.32, includeScore: true });
  cached = { fuse, builtAt: Date.now() };
  return fuse;
}

const MAX_NAMES = 500;

export interface VerifyResult {
  input: string;
  status: "matched" | "possible" | "not_found";
  match: Pick<Sponsor, "id" | "name" | "town" | "region" | "rating" | "routeCount"> | null;
  score: number | null;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const names = (body as { names?: unknown }).names;
  if (!Array.isArray(names) || names.some((n) => typeof n !== "string")) {
    return NextResponse.json({ error: "Body must be { names: string[] }" }, { status: 400 });
  }
  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return NextResponse.json({ error: "No non-empty names provided" }, { status: 400 });
  }
  if (cleaned.length > MAX_NAMES) {
    return NextResponse.json({ error: `Too many names - max ${MAX_NAMES} per request, got ${cleaned.length}` }, { status: 400 });
  }

  const fuse = await getFuseIndex();

  const results: VerifyResult[] = cleaned.map((input) => {
    const hits = fuse.search(input, { limit: 1 });
    const top = hits[0];
    if (!top) return { input, status: "not_found", match: null, score: null };

    const score = top.score ?? 1;
    const exact = top.item.name.toLowerCase() === input.toLowerCase();
    return {
      input,
      status: exact || score <= 0.08 ? "matched" : "possible",
      match: {
        id: top.item.id,
        name: top.item.name,
        town: top.item.town,
        region: top.item.region,
        rating: top.item.rating,
        routeCount: top.item.routeCount,
      },
      score,
    };
  });

  return NextResponse.json({ results });
}
