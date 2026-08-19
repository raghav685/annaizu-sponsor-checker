import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSponsorBySlug, getOtherSponsorsInTown } from "@/lib/serverData";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RatingBadge, RoutePill, SponsorTypeTag } from "@/components/ui/Badges";
import { CopyRecordButton } from "@/components/sponsor/CopyRecordButton";
import { BackToConsoleLink } from "@/components/sponsor/BackToConsoleLink";
import { buildMetadata } from "@/lib/seo";

const GOV_UK_REGISTER_URL = "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers";
const ANNAIZU_URL = "https://www.annaizu.com/";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sponsor = await getSponsorBySlug(slug);
  if (!sponsor) return { title: "Sponsor not found", robots: { index: false, follow: true } };
  return buildMetadata({
    title: `${sponsor.name} Sponsor Licence | ${sponsor.town} | Annaizu`,
    description: `${sponsor.name} is a ${sponsor.rating}-rated UK visa sponsor in ${sponsor.town}, holding ${sponsor.routeCount} route${sponsor.routeCount === 1 ? "" : "s"} on the Home Office register.`,
    path: `/sponsor/${slug}`,
  });
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2 last:border-b-0">
      <dt className="font-mono text-xs uppercase tracking-wide text-mist-dim">{label}</dt>
      <dd className="text-right font-mono text-sm text-mist">{value}</dd>
    </div>
  );
}

export default async function SponsorDetailPage({ params }: Props) {
  const { slug } = await params;
  const sponsor = await getSponsorBySlug(slug);
  if (!sponsor) notFound();

  const others = await getOtherSponsorsInTown(sponsor.town, sponsor.id);

  return (
    <main className="relative min-h-[100dvh] bg-void px-6 py-16 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Browse", href: "/browse" },
            { label: sponsor.town, href: `/browse/city/${encodeURIComponent(sponsor.town)}` },
            { label: sponsor.name, href: `/sponsor/${sponsor.id}` },
          ]}
        />
        <div className="mt-4">
          <BackToConsoleLink />
        </div>

        <GlassPanel elevation="raised" className="mt-4 p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-display text-2xl font-semibold text-mist lg:text-3xl">{sponsor.name}</h1>
            <RatingBadge rating={sponsor.rating} />
          </div>
          <p className="mt-2 font-mono text-sm text-mist-dim">
            {sponsor.town}
            {sponsor.county ? `, ${sponsor.county}` : ""} · {sponsor.region}
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-mist-dim">
            {sponsor.name} is listed on the current UK register of licensed sponsors in {sponsor.town}. Below is its
            sponsor rating and the Worker or Temporary Worker routes shown in the published register.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <SponsorTypeTag type={sponsor.sponsorType} />
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wide text-mist-dim">
              {sponsor.sector} (inferred)
            </span>
          </div>

          <div className="mt-8">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-mist-dim">Sponsor licence details</h2>
            <dl className="rounded-lg border border-hairline px-4">
              <DetailRow label="Organisation" value={sponsor.name} />
              <DetailRow label="Town / city" value={sponsor.town} />
              <DetailRow label="County / region" value={sponsor.county ? `${sponsor.county}, ${sponsor.region}` : sponsor.region} />
              <DetailRow label="Rating" value={sponsor.rating} />
              <DetailRow label="Licence type" value={sponsor.sponsorType} />
              <DetailRow label="Routes held" value={sponsor.routeCount} />
            </dl>
          </div>

          <div className="mt-8">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-mist-dim">Routes held ({sponsor.routeCount})</h2>
            <div className="flex flex-wrap gap-2">
              {sponsor.routes.map((r) => (
                <RoutePill key={r} label={r} />
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-mist-dim">What this sponsor licence means</h2>
            <p className="max-w-xl text-sm leading-relaxed text-mist-dim">
              A sponsor licence lets this organisation sponsor eligible workers on the routes listed above. It is not
              a guarantee of current vacancies, and does not mean this organisation will sponsor any particular
              applicant.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <CopyRecordButton sponsor={sponsor} />
            {sponsor.website && (
              <a
                href={sponsor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-xs text-mist transition-colors hover:border-signal/40 hover:text-signal"
              >
                Official website
              </a>
            )}
            {sponsor.linkedin && (
              <a
                href={sponsor.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-xs text-mist transition-colors hover:border-signal/40 hover:text-signal"
              >
                LinkedIn
              </a>
            )}
          </div>
        </GlassPanel>

        <div className="mt-8 rounded-xl border border-signal/30 bg-signal/[0.06] p-5">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-signal">Verify this sponsor</h2>
          <p className="max-w-xl text-sm leading-relaxed text-mist-dim">
            This page mirrors the GOV.UK register - always confirm current status directly on the official source
            before relying on it for anything consequential.
          </p>
          <a
            href={GOV_UK_REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-signal/40 bg-signal/10 px-4 py-2 font-mono text-xs text-signal transition-colors hover:bg-signal/20"
          >
            Verify on GOV.UK →
          </a>
        </div>

        {others.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-mist-dim">
              Other licensed sponsors in {sponsor.town}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {others.map((o) => (
                <Link key={o.id} href={`/sponsor/${o.id}`}>
                  <GlassPanel elevation="base" className="p-4 transition-colors hover:border-signal/30 hover:bg-white/[0.03]">
                    <p className="truncate font-display text-sm text-mist">{o.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-mist-dim">{o.routeCount} route{o.routeCount === 1 ? "" : "s"} · {o.rating}</p>
                  </GlassPanel>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-hairline-strong bg-white/[0.03] p-5">
          <h2 className="font-display text-sm font-semibold text-mist">Are you a UK sponsor?</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-mist-dim">
            Manage sponsor duties, employee records and compliance with Annaizu.
          </p>
          <a href={ANNAIZU_URL} target="_blank" rel="noopener" className="mt-3 inline-block font-mono text-xs text-signal hover:underline">
            Explore Annaizu →
          </a>
        </div>
      </div>
    </main>
  );
}
