"use client";

import { useState } from "react";
import type { Sponsor } from "@/lib/types";

export function CopyRecordButton({ sponsor }: { sponsor: Sponsor }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = [
      sponsor.name,
      `${sponsor.town}${sponsor.county ? `, ${sponsor.county}` : ""} (${sponsor.region})`,
      `Rating: ${sponsor.rating}`,
      `Sponsor type: ${sponsor.sponsorType}`,
      `Routes: ${sponsor.routes.join(", ")}`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-xs text-mist transition-colors hover:border-signal/40 hover:text-signal"
    >
      {copied ? "Copied" : "Copy record"}
    </button>
  );
}
