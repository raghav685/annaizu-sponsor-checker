import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (local dev DB) loads a WASM binary via import.meta.url-relative
  // paths that webpack's bundling breaks; keep it (and the postgres driver, for
  // consistency) as a real Node dependency instead of bundling it.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // PGlite is a single-process embedded DB (like SQLite) - Next's default
  // multi-worker static generation opens several concurrent connections to
  // the same .pglite-data file and crashes the WASM runtime. Not an issue in
  // production (Neon is a real multi-connection server); only matters for
  // local `next build` against the PGlite fallback.
  experimental: { cpus: 1 },
};

export default nextConfig;
