import type { Metadata } from "next";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About the UK Sponsor Licence Checker | Annaizu",
  description: "Who built this sponsor checker, where its data comes from, and what it isn't.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <main className="relative min-h-[100dvh] bg-void px-6 py-12 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/about" }]} />
        <h1 className="mt-4 font-display text-2xl font-semibold text-mist lg:text-3xl">About the Annaizu UK Sponsor Licence Checker</h1>

        <GlassPanel elevation="raised" className="mt-6 space-y-4 p-5 text-sm leading-relaxed text-mist-dim lg:p-6">
          <p>
            This sponsor checker is built and maintained by{" "}
            <a href="https://www.annaizu.com/" target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">
              annaizu
            </a>
            , the platform UK employers use to manage sponsor licence compliance, Certificates of Sponsorship, and right-to-work
            checks in one place. We built this checker because the question &quot;does this organisation actually hold a sponsor
            licence right now&quot; comes up constantly - for HR teams vetting a new hire&apos;s employer, for candidates
            weighing an offer, and for compliance teams keeping their own record honest against GOV.UK&apos;s.
          </p>
          <p>
            This is a searchable mirror of the Home Office&apos;s register of organisations licensed to sponsor Skilled Worker and
            other UK visas. The register itself is published by GOV.UK; this site fetches it, keeps a history of what changed
            between publishes, and adds search, filtering, and analysis on top.
          </p>
          <p>
            <strong className="text-mist">It is not an official Home Office service.</strong> Appearing here means an organisation
            held a sponsor licence as of the last successful sync - it does not mean the organisation is currently hiring, that it
            will sponsor any particular applicant, or that its licence hasn&apos;t changed since. Always verify current status
            directly on{" "}
            <a
              href="https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-signal hover:underline"
            >
              GOV.UK
            </a>{" "}
            before relying on it for anything consequential.
          </p>
          <p>
            Sector labels shown across the site are inferred from keywords in an organisation&apos;s name (e.g. &quot;care&quot;,
            &quot;construction&quot;) - they are not part of the official register and will be wrong for some organisations. See{" "}
            <Link href="/methodology" className="text-signal hover:underline">
              Data &amp; methodology
            </Link>{" "}
            for how everything else is built, including the known limitations around renames, relocations, and register
            &quot;removals&quot;.
          </p>
          <p>Data is published under the Open Government Licence v3.0 and contains public sector information.</p>
        </GlassPanel>
      </div>
    </main>
  );
}
