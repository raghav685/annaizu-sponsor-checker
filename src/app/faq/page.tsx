import type { Metadata } from "next";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Common questions about the UK licensed sponsors register and how this site presents it.",
};

const FAQS: { q: string; a: React.ReactNode }[] = [
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
  },
  {
    q: "Is this the official GOV.UK register?",
    a: "No. This is an independent, unofficial mirror. It exists to make the register easier to search and track changes in - always confirm anything important directly on GOV.UK.",
  },
  {
    q: "Where does the “sector” label come from?",
    a: "It's inferred from keywords in the organisation's name and isn't part of the official register - treat it as a rough guide, not a fact.",
  },
];

export default function FaqPage() {
  return (
    <main className="relative min-h-[100dvh] bg-void px-6 py-12 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-semibold text-mist lg:text-3xl">Frequently asked questions</h1>
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
