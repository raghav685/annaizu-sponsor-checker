import type { Metadata } from "next";
import { VerifyForm } from "@/components/verify/VerifyForm";

export const metadata: Metadata = {
  title: "Verify a list of sponsors",
  description: "Bulk-check a list of organisation names against the UK Home Office register of licensed sponsors.",
};

export default function VerifyPage() {
  return (
    <main className="relative min-h-[100dvh] bg-void px-6 py-12 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-2xl font-semibold text-mist lg:text-3xl">Verify a list of sponsors</h1>
        <p className="mt-2 font-mono text-sm text-mist-dim">
          Paste or upload a list of organisation names to fuzzy-match each one against the current active register. Useful for
          checking a shortlist of employers in one pass rather than one search at a time.
        </p>
        <p className="mt-2 font-mono text-xs text-mist-dim/70">
          Matching is name-based only and can be fooled by rebrands, trading names, or coincidental name overlaps - always confirm a
          match on the sponsor&apos;s own page before relying on it.
        </p>

        <div className="mt-6">
          <VerifyForm />
        </div>
      </div>
    </main>
  );
}
