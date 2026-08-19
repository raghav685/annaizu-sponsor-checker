"use client";

import Image from "next/image";
import Link from "next/link";
import { useExplorerStore } from "@/lib/store";
import type { Meta } from "@/lib/types";

const GOV_UK_REGISTER_URL = "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers";
const ANNAIZU_URL = "https://www.annaizu.com/";

const FOOTER_LINKS = [
  { href: "/sponsors", label: "Search sponsors" },
  { href: "/map", label: "Map" },
  { href: "/browse", label: "Browse" },
  { href: "/methodology", label: "Methodology" },
  { href: "/faq", label: "FAQs" },
  { href: "/about", label: "About" },
];

export function Footer({ initialMeta = null }: { initialMeta?: Meta | null }) {
  const meta = useExplorerStore((s) => s.meta) ?? initialMeta;

  return (
    <footer className="relative z-content border-t border-hairline bg-void px-6 py-10 lg:px-16">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <Link href="/" className="inline-block">
              <Image src="/brand/annaizu-logo-dark-bg.png" alt="Annaizu" width={344} height={53} className="h-6 w-auto opacity-80" />
            </Link>
            <p className="font-mono text-xs text-mist-dim">UK Sponsor Licence Checker by Annaizu</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-mist-dim">
            {FOOTER_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-signal">
                {l.label}
              </Link>
            ))}
            <a href={GOV_UK_REGISTER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-signal">
              GOV.UK source
            </a>
            <a href={ANNAIZU_URL} target="_blank" rel="noopener" className="hover:text-signal">
              Annaizu
            </a>
          </nav>
        </div>

        <div className="rounded-xl border border-signal/30 bg-signal/[0.06] px-5 py-4">
          <p className="font-mono text-xs text-mist">
            For employers: manage sponsor duties, right-to-work checks and compliance with{" "}
            <a href={ANNAIZU_URL} target="_blank" rel="noopener" className="text-signal hover:underline">
              Annaizu →
            </a>
          </p>
        </div>

        <div className="space-y-3 font-mono text-xs leading-relaxed text-mist-dim">
          <p>
            Data source:{" "}
            <a href={meta?.sourceUrl ?? GOV_UK_REGISTER_URL} className="text-signal hover:underline" target="_blank" rel="noopener noreferrer">
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
      </div>
    </footer>
  );
}
