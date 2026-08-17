import { Reveal } from "./Reveal";
import { ShieldCheck, Landmark, Info } from "@/lib/icons";

const CARDS = [
  {
    icon: ShieldCheck,
    title: "What a sponsor licence is",
    body: "To legally employ someone from outside the UK on a work visa, a UK employer must first apply to the Home Office for a sponsor licence. Holding one doesn't guarantee any specific job or visa — it means the organisation has been approved to sponsor overseas workers at all.",
  },
  {
    icon: Info,
    title: "What the rating means",
    body: "Licensed sponsors get an A or B rating. A rating is the standard, fully-compliant tier — some organisations also carry an SME+ or Premium marker reflecting their size or service level. A B rating means the Home Office has flagged compliance issues; the sponsor can still operate but is being monitored more closely. Neither rating is a comment on how good an employer is to work for.",
  },
  {
    icon: Landmark,
    title: "What a visa route is",
    body: "Each licence is tied to one or more \"routes\" — categories like Skilled Worker, Seasonal Worker, or Global Business Mobility — which define who the organisation is allowed to sponsor and under what conditions. An organisation licensed for one route can't sponsor a worker under a route it doesn't hold.",
  },
];

export function EducationSection() {
  return (
    <section id="learn" className="mx-auto w-full max-w-[var(--container-max)] px-5 py-20 md:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-semibold text-ink md:text-4xl">
          Sponsor licences, in plain English
        </h2>
        <p className="prose-measure mx-auto mt-3 text-ink-muted">
          No legal jargon — just what the terms on the register actually mean,
          for job seekers and employers alike.
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {CARDS.map((card, i) => (
          <Reveal key={card.title} delay={i * 0.08} className="flex flex-col gap-4">
            <span className="flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-brand-soft text-brand">
              <card.icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="font-display text-lg font-medium text-ink">{card.title}</h3>
            <p className="prose-measure text-sm leading-relaxed text-ink-muted">{card.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
