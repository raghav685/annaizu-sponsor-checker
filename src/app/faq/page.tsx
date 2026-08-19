import type { Metadata } from "next";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "UK Sponsor Licence Checker FAQs | Annaizu",
  description: "Common questions about the UK licensed sponsors register and how this site presents it.",
  path: "/faq",
});

interface Faq {
  q: string;
  a: React.ReactNode;
  /** Plain-text answer for the FAQPage schema, when `a` is JSX rather than a string. */
  plainA?: string;
}

const FAQS: Faq[] = [
  {
    q: "What is the UK register of licensed sponsors?",
    a: "It's the Home Office's published list of organisations permitted to sponsor migrants on UK visa routes such as Skilled Worker. This site mirrors that register, kept in sync with GOV.UK.",
  },
  {
    q: "How do I check if a UK company has a sponsor licence?",
    a: (
      <>
        Search the organisation&apos;s name on the{" "}
        <Link href="/sponsors" className="text-signal hover:underline">
          sponsors page
        </Link>
        . A match means it appeared on the register as of the last successful sync - always verify anything
        consequential directly on GOV.UK.
      </>
    ),
    plainA: "Search the organisation's name on the sponsors page. A match means it appeared on the register as of the last successful sync - always verify anything consequential directly on GOV.UK.",
  },
  {
    q: "What is a sponsor licence?",
    a: "It's Home Office permission for an organisation to sponsor migrants on certain UK visa routes, e.g. Skilled Worker. It's a legal permission, not a hiring pipeline.",
  },
  {
    q: "Does being on this list mean a company is hiring?",
    a: "No. A licence means the organisation is permitted to sponsor a visa if it chooses to hire someone who needs one. It says nothing about current vacancies.",
  },
  {
    q: "What do the A and B ratings mean?",
    a: "A-rated sponsors are fully compliant with their sponsor duties. B-rated sponsors have had compliance issues and are given a time-limited action plan to fix them before being downgraded or losing their licence entirely.",
  },
  {
    q: "What's the difference between “Worker” and “Temporary Worker” routes?",
    a: "Worker routes (e.g. Skilled Worker) are longer-term, points-based routes. Temporary Worker routes (e.g. Seasonal Worker, Charity Worker) are time-limited. Some organisations hold licences on both.",
  },
  {
    q: "How often is this data updated?",
    a: "A sync runs daily at 06:00 UTC, fetching the latest published register from GOV.UK. If nothing has changed since the last publish, the sync records that and nothing else happens.",
  },
  {
    q: "Why might a sponsor disappear from the register between visits?",
    a: (
      <>
        The Home Office removes sponsors that lose their licence, but this site currently can&apos;t distinguish that from a
        rename or an office relocation - both look identical to a removal in the underlying diff. See the{" "}
        <Link href="/changelog" className="text-signal hover:underline">
          changelog
        </Link>{" "}
        and{" "}
        <Link href="/methodology" className="text-signal hover:underline">
          methodology
        </Link>{" "}
        page for the full explanation.
      </>
    ),
    plainA: "The Home Office removes sponsors that lose their licence, but this site currently can't distinguish that from a rename or an office relocation - both look identical to a removal in the underlying diff. See the changelog and methodology page for the full explanation.",
  },
  {
    q: "Is this the official GOV.UK register?",
    a: "No. This is an independent, unofficial mirror. It exists to make the register easier to search and track changes in - always confirm anything important directly on GOV.UK.",
  },
  {
    q: "Where does Annaizu get its sponsor licence data?",
    a: (
      <>
        Directly from GOV.UK&apos;s published register of licensed sponsors, via its official content API - see{" "}
        <Link href="/methodology" className="text-signal hover:underline">
          Data &amp; methodology
        </Link>{" "}
        for the full sync process.
      </>
    ),
    plainA: "Directly from GOV.UK's published register of licensed sponsors, via its official content API - see Data & methodology for the full sync process.",
  },
  {
    q: "Who built this, and why?",
    a: (
      <>
        This checker is built and maintained by{" "}
        <a href="https://www.annaizu.com/" target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">
          annaizu
        </a>
        , which helps UK employers manage sponsor licence compliance. Checking whether an organisation genuinely holds a
        sponsor licence is a question our own customers ask constantly - this tool makes that check public and free for anyone.
      </>
    ),
    plainA: "This checker is built and maintained by annaizu, which helps UK employers manage sponsor licence compliance. Checking whether an organisation genuinely holds a sponsor licence is a question our own customers ask constantly - this tool makes that check public and free for anyone.",
  },
  {
    q: "Where does the “sector” label come from?",
    a: "It's inferred from keywords in the organisation's name and isn't part of the official register - treat it as a rough guide, not a fact.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.plainA ?? (typeof f.a === "string" ? f.a : "") },
  })),
};

export default function FaqPage() {
  return (
    <main className="relative min-h-[100dvh] bg-void px-6 py-12 lg:px-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "FAQs", href: "/faq" }]} />
        <h1 className="mt-4 font-display text-2xl font-semibold text-mist lg:text-3xl">UK sponsor licence FAQs</h1>
        <div className="mt-6 space-y-3">
          {FAQS.map((item) => (
            <GlassPanel key={item.q} elevation="base" as="details" className="group p-4 lg:p-5">
              <summary className="cursor-pointer select-none font-display text-sm text-mist marker:content-none">
                <span className="mr-2 inline-block text-signal transition-transform group-open:rotate-90">›</span>
                {item.q}
              </summary>
              <div className="mt-3 pl-4 text-sm leading-relaxed text-mist-dim">{item.a}</div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </main>
  );
}
