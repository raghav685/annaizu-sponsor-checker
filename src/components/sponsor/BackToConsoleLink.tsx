"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";

export function BackToConsoleLink() {
  return (
    <Link href="/#console" className="mb-8 inline-flex items-center gap-2 font-mono text-xs text-mist-dim hover:text-signal">
      <ArrowLeft className="h-4 w-4" /> Back to console
    </Link>
  );
}
