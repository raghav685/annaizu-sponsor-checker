import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSponsorBySlug, getOtherSponsorsInTown } from "@/lib/serverData";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { RatingBadge, RoutePill, SponsorTypeTag } from "@/components/ui/Badges";
import { CopyRecordButton } from "@/components/sponsor/CopyRecordButton";
import { BackToConsoleLink } from "@/components/sponsor/BackToConsoleLink";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sponsor = await getSponsorBySlug(slug);
  if (!sponsor) return { title: "Sponsor not found" };
  return {
    title: sponsor.name,
    description: `${sponsor.name} is a ${sponsor.rating}-rated UK visa sponsor in ${sponsor.town}, holding ${sponsor.routeCount} route${sponsor.routeCount === 1 ? "" : "s"} on the Home Office register.`,
  };
}

export default async function SponsorDetailPage({ params }: Props) {
  const { slug } = await params;
  const sponsor = await getSponsorBySlug(slug);
  if (!sponsor) notFound();

  const others = await getOtherSponsorsInTown(sponsor.town, sponsor.id);
  const govUkSearchUrl = `https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers`;

  return (
    <main className="relative min-h-[100dvh] bg-void px-6 py-16 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <BackToConsoleLink />

        <GlassPanel elevation="raised" className="p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-display text-2xl font-semibold text-mist lg:text-3xl">{sponsor.name}</h1>
            <RatingBadge rating={sponsor.rating} />
          </div>
          <p className="mt-2 font-mono text-sm text-mist-dim">
            {sponsor.town}
            {sponsor.county ? `, ${sponsor.county}` : ""} · {sponsor.region}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <SponsorTypeTag type={sponsor.sponsorType} />
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wide text-mist-dim">
              {sponsor.sector} (inferred)
            </span>
          </div>

          <div className="mt-8">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-mist-dim">
              Routes held ({sponsor.routeCount})
            </h2>
            <div className="flex flex-wrap gap-2">
              {sponsor.routes.map((r) => (
                <RoutePill key={r} label={r} />
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <CopyRecordButton sponsor={sponsor} />
            <a
              href={govUkSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-xs text-mist transition-colors hover:border-signal/40 hover:text-signal"
            >
              Verify on GOV.UK
            </a>
          </div>
        </GlassPanel>

        {others.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-mist-dim">
              Other sponsors in {sponsor.town}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {others.map((o) => (
                <Link key={o.id} href={`/sponsor/${o.id}`}>
                  <GlassPanel elevation="base" className="p-3.5 transition-colors hover:border-signal/30">
                    <p className="truncate font-display text-sm text-mist">{o.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-mist-dim">{o.routeCount} route{o.routeCount === 1 ? "" : "s"} · {o.rating}</p>
                  </GlassPanel>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
