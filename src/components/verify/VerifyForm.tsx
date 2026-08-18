"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { RatingBadge } from "@/components/ui/Badges";
import { exportVerifyResultsCsv } from "@/lib/export";
import type { VerifyResult } from "@/app/api/verify/route";

const NAME_HEADER_CANDIDATES = ["name", "organisation", "organisation name", "organization", "company", "company name", "employer"];

const STATUS_LABEL: Record<VerifyResult["status"], string> = {
  matched: "Matched",
  possible: "Possible match",
  not_found: "Not found",
};

const STATUS_COLOR: Record<VerifyResult["status"], string> = {
  matched: "text-signal",
  possible: "text-ember",
  not_found: "text-mist-dim",
};

/** Case-insensitive/fuzzy header matching, same convention the register-CSV parser uses (see DECISIONS.md). */
function extractNamesFromCsv(text: string): string[] {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const fields = parsed.meta.fields ?? [];
  const nameField = fields.find((f) => NAME_HEADER_CANDIDATES.includes(f.trim().toLowerCase()));
  if (nameField) {
    return (parsed.data as Record<string, string>[]).map((row) => row[nameField]?.trim() ?? "").filter(Boolean);
  }
  // No recognisable header - fall back to the first column of every row, header included.
  const fallback = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
  return fallback.data.map((row) => row[0]?.trim() ?? "").filter(Boolean);
}

export function VerifyForm() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<VerifyResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const names = text
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);

  async function handleFile(file: File) {
    const content = await file.text();
    const extracted = extractNamesFromCsv(content);
    setText((prev) => [prev.trim(), ...extracted].filter(Boolean).join("\n"));
  }

  async function handleSubmit() {
    if (names.length === 0) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const summary = results
    ? {
        matched: results.filter((r) => r.status === "matched").length,
        possible: results.filter((r) => r.status === "possible").length,
        notFound: results.filter((r) => r.status === "not_found").length,
      }
    : null;

  return (
    <div className="space-y-6">
      <GlassPanel elevation="base" className="p-4 lg:p-5">
        <label htmlFor="verify-names" className="mb-2 block font-mono text-xs uppercase tracking-wide text-mist-dim">
          Organisation names (one per line, up to 500)
        </label>
        <textarea
          id="verify-names"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"Acme Ltd\nExample Care Home\nNorthbridge Consulting"}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 font-mono text-sm text-mist placeholder:text-mist-dim/50 focus-visible:border-signal/50"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-xs text-mist transition-colors hover:border-signal/40 hover:text-signal"
          >
            Upload CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={names.length === 0 || loading}
            className="rounded-lg border border-signal/40 bg-signal/10 px-4 py-2 font-mono text-xs text-signal transition-colors hover:bg-signal/20 disabled:opacity-40"
          >
            {loading ? "Checking…" : `Check ${names.length || ""} name${names.length === 1 ? "" : "s"}`}
          </button>
          {error && <p className="font-mono text-xs text-ember">{error}</p>}
        </div>
      </GlassPanel>

      {results && summary && (
        <GlassPanel elevation="base" className="p-4 lg:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs text-mist-dim">
              <span className="text-signal">{summary.matched} matched</span> ·{" "}
              <span className="text-ember">{summary.possible} possible</span> ·{" "}
              <span className="text-mist-dim">{summary.notFound} not found</span>
            </p>
            <button
              onClick={() => exportVerifyResultsCsv(results)}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-mist transition-colors hover:border-signal/40 hover:text-signal"
            >
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline-strong">
                  <th className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-wide text-mist-dim/70">Name checked</th>
                  <th className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-wide text-mist-dim/70">Status</th>
                  <th className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-wide text-mist-dim/70">Register match</th>
                  <th className="pb-2 font-mono text-[10px] uppercase tracking-wide text-mist-dim/70">Rating</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-hairline last:border-b-0">
                    <td className="py-2.5 pr-4 font-mono text-xs text-mist">{r.input}</td>
                    <td className={`whitespace-nowrap py-2.5 pr-4 font-mono text-xs ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-mist-dim">
                      {r.match ? (
                        <Link href={`/sponsor/${r.match.id}`} className="text-mist hover:text-signal hover:underline">
                          {r.match.name} <span className="text-mist-dim">· {r.match.town}</span>
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 font-mono text-xs">{r.match ? <RatingBadge rating={r.match.rating} /> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
