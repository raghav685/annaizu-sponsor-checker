// Resolves the current CSV asset for the sponsor register via the GOV.UK
// Content API rather than scraping HTML - the recommended, stable approach.
// Verified shape against the live API on 2026-08-17:
//   https://www.gov.uk/api/content/government/publications/register-of-licensed-sponsors-workers
// Top-level fields include `public_updated_at` (the register's own freshness
// date - distinct from our own sync timestamp) and `details.attachments[]`.

const CONTENT_API_URL =
  "https://www.gov.uk/api/content/government/publications/register-of-licensed-sponsors-workers";
const PUBLICATION_URL =
  "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers";
const USER_AGENT = "uk-sponsors-explorer-sync/1.0 (+https://github.com/annaizu)";

interface Attachment {
  url: string;
  filename: string;
  content_type: string;
  title?: string;
  id?: string;
}

interface ContentApiResponse {
  public_updated_at: string;
  base_path: string;
  content_id: string;
  details: {
    attachments?: Attachment[];
  };
}

export interface ResolvedSource {
  csvUrl: string;
  csvFilename: string;
  registerPublicUpdatedAt: string;
  sourceUrl: string;
  contentApiUrl: string;
}

function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function pickMostRecentCsv(attachments: Attachment[]): Attachment {
  const csvs = attachments.filter((a) => a.content_type === "text/csv");
  if (csvs.length === 0) {
    throw new Error(
      `No CSV attachment found on the publication page. Attachment content types seen: ${attachments
        .map((a) => a.content_type)
        .join(", ")}`
    );
  }
  if (csvs.length === 1) return csvs[0];

  // Naming convention has changed before (e.g. "2025-12-22_-_Worker..." vs
  // "SP_-_Worker_..._2026-07-31.csv") - don't assume a fixed prefix/suffix,
  // just pull whichever trailing/embedded YYYY-MM-DD is present and take the max.
  const dated = csvs
    .map((a) => ({ attachment: a, date: extractDateFromFilename(a.filename) }))
    .filter((x): x is { attachment: Attachment; date: string } => x.date !== null);

  if (dated.length > 0) {
    dated.sort((a, b) => b.date.localeCompare(a.date));
    return dated[0].attachment;
  }

  // No date could be parsed from any filename - fail loudly rather than guess.
  throw new Error(
    `Multiple CSV attachments found and none has a parseable date in its filename: ${csvs
      .map((a) => a.filename)
      .join(", ")}`
  );
}

export async function resolveCurrentSource(): Promise<ResolvedSource> {
  const res = await fetch(CONTENT_API_URL, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`GOV.UK Content API returned ${res.status} ${res.statusText} for ${CONTENT_API_URL}`);
  }
  const data = (await res.json()) as ContentApiResponse;

  if (!data.public_updated_at) {
    throw new Error("Content API response is missing public_updated_at - refusing to proceed without a freshness date.");
  }
  const attachments = data.details?.attachments;
  if (!attachments || attachments.length === 0) {
    throw new Error("Content API response has no details.attachments - the publication page structure may have changed.");
  }

  const csv = pickMostRecentCsv(attachments);

  return {
    csvUrl: csv.url,
    csvFilename: csv.filename,
    registerPublicUpdatedAt: data.public_updated_at,
    sourceUrl: PUBLICATION_URL,
    contentApiUrl: CONTENT_API_URL,
  };
}

export async function fetchCsv(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Failed to download CSV: ${res.status} ${res.statusText} for ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
