import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredSnapshot {
  url: string;
  key: string;
}

// Production stores gzipped CSV snapshots in Vercel Blob (BLOB_READ_WRITE_TOKEN
// set). Local dev has no blob store provisioned, so it falls back to a
// gitignored local directory with the same interface, so the sync script
// doesn't need to know which one it's talking to.
export async function putSnapshot(key: string, data: Buffer): Promise<StoredSnapshot> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, data, { access: "public", addRandomSuffix: false });
    return { url: blob.url, key: blob.pathname };
  }

  const dir = path.join(process.cwd(), ".snapshots");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, key.replace(/\//g, "__"));
  await writeFile(filePath, data);
  return { url: `file://${filePath}`, key };
}
