import { Reveal } from "./Reveal";
import { ChevronDown } from "@/lib/icons";

const FAQS = [
  {
    q: "How often is this data updated?",
    a: "Annaizu is built directly from the Home Office's own published Register of Licensed Sponsors, which the government updates on a rolling basis (typically every few working days). The exact date this copy was generated is shown under the counter above and in the footer.",
  },
  {
    q: "What does a sponsor's \"rating\" actually mean?",
    a: "It's the Home Office's compliance rating for that organisation as a sponsor, not a quality or trustworthiness score for the employer generally. A rating is standard; B rating means they're under closer monitoring for compliance issues but are still licensed to sponsor.",
  },
  {
    q: "Does being on this register guarantee I'll get a visa or a job?",
    a: "No. It confirms the organisation is licensed to sponsor workers under specific visa routes — nothing more. Whether you personally get a job offer, and whether that offer leads to a successful visa application, depends on separate eligibility criteria and the employer's own hiring decision.",
  },
  {
    q: "Is Annaizu affiliated with the Home Office or UK government?",
    a: "No. Annaizu is an independent tool built on top of the government's public data. We're not affiliated with, endorsed by, or acting on behalf of the Home Office — see the disclaimer in the footer.",
  },
  {
    q: "I can't find an employer I know sponsors visas — why?",
    a: "Try searching a shorter or slightly different version of the name — the register uses each organisation's registered legal name, which can differ from its trading or brand name. If it's genuinely not listed, it may not currently hold a licence, or may sponsor through a separate legal entity.",
  },
  {
    q: "What's the difference between the visa \"routes\" shown?",
    a: "Each route covers a different kind of work — Skilled Worker for most long-term skilled roles, Seasonal Worker for short-term agricultural work, Global Business Mobility for intra-company transfers, and so on. A sponsor can hold one or several routes; the sponsor detail view lists exactly which ones.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="mx-auto w-full max-w-[var(--container-max)] px-5 py-20 md:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-semibold text-ink md:text-4xl">
          Frequently asked questions
        </h2>
      </Reveal>

      <Reveal delay={0.08} className="mx-auto mt-10 flex max-w-2xl flex-col gap-3">
        {FAQS.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-[var(--radius-md)] border border-border bg-surface-raised px-5 py-4 open:bg-surface"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
              {faq.q}
              <ChevronDown
                className="size-4 shrink-0 text-ink-muted transition-transform duration-[var(--duration-micro)] group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="prose-measure mt-3 text-sm leading-relaxed text-ink-muted">{faq.a}</p>
          </details>
        ))}
      </Reveal>
    </section>
  );
}
