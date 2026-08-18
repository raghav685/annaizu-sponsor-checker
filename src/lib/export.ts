import Papa from "papaparse";
import type { Sponsor } from "./types";
import type { VerifyResult } from "@/app/api/verify/route";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSponsorsCsv(sponsors: Sponsor[], filename = "uk-sponsors-export.csv") {
  const rows = sponsors.map((s) => ({
    "Organisation Name": s.name,
    "Town/City": s.town,
    County: s.county,
    Region: s.region,
    "Sector (inferred)": s.sector,
    Routes: s.routes.join("; "),
    Rating: s.rating,
    "Sponsor Type": s.sponsorType,
  }));
  downloadCsv(Papa.unparse(rows), filename);
}

export function exportVerifyResultsCsv(results: VerifyResult[], filename = "sponsor-list-verification.csv") {
  const rows = results.map((r) => ({
    "Name Checked": r.input,
    Status: r.status === "matched" ? "Matched" : r.status === "possible" ? "Possible match" : "Not found",
    "Matched Sponsor": r.match?.name ?? "",
    "Town/City": r.match?.town ?? "",
    Region: r.match?.region ?? "",
    Rating: r.match?.rating ?? "",
  }));
  downloadCsv(Papa.unparse(rows), filename);
}
