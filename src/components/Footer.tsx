"use client";

import { useExplorerStore } from "@/lib/store";

export function Footer() {
  const meta = useExplorerStore((s) => s.meta);

  return (
    <footer className="relative z-content border-t border-hairline bg-void px-6 py-10 lg:px-16">
      <div className="mx-auto max-w-4xl space-y-3 font-mono text-xs leading-relaxed text-mist-dim">
        <p>
          Data source:{" "}
          <a href={meta?.sourceUrl ?? "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers"} className="text-signal hover:underline" target="_blank" rel="noopener noreferrer">
            GOV.UK register of licensed sponsors
          </a>{" "}
          (Home Office / UK Visas and Immigration){meta ? `, last updated ${meta.govUkLastUpdated}` : ""}.
        </p>
        <p>Contains public sector information licensed under the Open Government Licence v3.0.</p>
        <p>
          This is an unofficial mirror, not a Home Office service. Always verify current status on GOV.UK. A
          licence does not mean an employer is hiring or will sponsor you. Sector labels are inferred from
          organisation names and are not official data.
        </p>
      </div>
    </footer>
  );
}
