import type { Metadata } from "next";
import { GlassPanel } from "@/components/ui/GlassPanel";

export const metadata: Metadata = {
  title: "Data & methodology",
  description: "Where the data comes from, how it's synced, and the known limitations of the identity-matching approach.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassPanel elevation="base" className="p-5 lg:p-6">
      <h2 className="mb-2 font-display text-base text-mist">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-mist-dim">{children}</div>
    </GlassPanel>
  );
}

export default function MethodologyPage() {
  return (
    <main className="relative min-h-[100dvh] bg-void px-6 py-12 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-mist lg:text-3xl">Data &amp; methodology</h1>
          <p className="mt-2 font-mono text-sm text-mist-dim">How this site turns the published register into what you see.</p>
        </div>

        <Section title="Source">
          <p>
            Every publish is fetched directly from GOV.UK&apos;s published CSV of the register of licensed sponsors, via the
            content API rather than a hardcoded link, so it keeps working when GOV.UK rotates the file URL.
          </p>
        </Section>

        <Section title="Sync cadence">
          <p>
            A sync runs automatically once a day at 06:00 UTC. It hashes the fetched file first - if it&apos;s byte-identical to
            the last one processed, nothing else happens and that&apos;s recorded as a no-change run. A manual sync can also be
            triggered from the sync status page.
          </p>
        </Section>

        <Section title="Sponsor identity">
          <p>
            Each sponsor is identified by a normalised organisation name paired with its town, not name alone. Around 1,000 real
            organisations in the register share an identical name across multiple towns (multi-branch employers, franchises,
            NHS trusts) - keying identity by name alone would have silently merged distinct licences.
          </p>
        </Section>

        <Section title="What “removed from the register” means today">
          <p>
            Because identity is (name, town), a rename or an office relocation currently looks identical to a genuine licence
            loss - both show up as a removal followed by an addition. Treat every removal figure on this site as{" "}
            <em>observed register movement</em>, not confirmed licence loss, until Companies House cross-referencing (in
            progress) can tell these apart. This is also why KPI tiles show a single &quot;removed&quot; figure rather than a
            revoked/ceased split - splitting it today would mean guessing.
          </p>
        </Section>

        <Section title="Sector labels">
          <p>
            Sector is inferred from keywords in the organisation&apos;s name (e.g. &quot;care&quot;, &quot;construction&quot;).
            It is not part of the official register, is not verified against Companies House SIC codes yet, and will be wrong
            for organisations whose name doesn&apos;t hint at what they do.
          </p>
        </Section>

        <Section title="History & snapshots">
          <p>
            Every publish that changes the file is kept as a gzipped snapshot, and every individual sponsor-level change
            (added, removed, rating changed, route added/removed) is logged as an event - visible on the{" "}
            <a href="/changelog" className="text-signal hover:underline">
              changelog
            </a>
            . Analytics and KPI figures are derived directly from that event log, not a separately-maintained running total, so
            they can never drift out of sync with the underlying history.
          </p>
        </Section>
      </div>
    </main>
  );
}
