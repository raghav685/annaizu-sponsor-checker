"use client";

import { useStats } from "@/hooks/useStats";
import { formatSponsorDate } from "@/lib/format";
import { AnnaizuWordmark } from "./AnnaizuMark";
import { ExternalLink } from "@/lib/icons";

export function Footer() {
  const stats = useStats();

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-[var(--container-max)] flex-col gap-8 px-5 py-12 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
          <AnnaizuWordmark />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            <a href="#checker" className="hover:text-ink">
              Check a sponsor
            </a>
            <a href="#learn" className="hover:text-ink">
              About licences
            </a>
            <a href="#faq" className="hover:text-ink">
              FAQ
            </a>
          </nav>
        </div>

        <div className="prose-measure flex flex-col gap-3 border-t border-border pt-6 text-sm text-ink-muted">
          {stats?.isSample && (
            <p className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-ink">
              This preview is running on a small sample dataset, not the full
              live register.
            </p>
          )}
          <p>
            Sponsor data is sourced from the UK Home Office&apos;s public{" "}
            <a
              href={stats?.sourcePublicationUrl ?? "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-ink underline hover:text-brand"
            >
              Register of Licensed Sponsors
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
            , published and updated periodically by the Home Office.
            {stats?.generatedAt && (
              <> This copy was last refreshed on {formatSponsorDate(stats.generatedAt)}.</>
            )}
          </p>
          <p>
            Annaizu is an independent tool and is not affiliated with, endorsed
            by, or acting on behalf of the Home Office or any part of the UK
            government. Information is provided for general reference only and
            does not constitute legal or immigration advice.
          </p>
          <p>© {new Date().getFullYear()} Annaizu. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
