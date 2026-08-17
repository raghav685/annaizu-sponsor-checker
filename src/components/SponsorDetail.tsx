"use client";

import { useEffect, useRef } from "react";
import type { Sponsor } from "@/types/sponsor";
import { RatingBadge } from "./RatingBadge";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { MapPin, X, Landmark } from "@/lib/icons";

export function SponsorDetail({
  sponsor,
  onClose,
}: {
  sponsor: Sponsor | null;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isOpen = sponsor !== null;

  useFocusTrap(containerRef, isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!sponsor) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close sponsor details"
        onClick={onClose}
        className="absolute inset-0 bg-[oklch(0.1_0_0_/_0.45)] transition-opacity duration-[var(--duration-modal)]"
      />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sponsor-detail-heading"
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-surface-raised shadow-[0_0_60px_-10px_rgb(0_0_0_/_0.35)] animate-[slide-in_var(--duration-modal)_var(--ease-out-expo)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-brand-soft text-brand">
              <Landmark className="size-5" aria-hidden="true" />
            </span>
            <h2
              id="sponsor-detail-heading"
              className="font-display text-xl font-medium leading-snug text-ink"
            >
              {sponsor.organisationName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted hover:bg-surface hover:text-ink"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center gap-1.5 text-sm text-ink-muted">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            {sponsor.townCity}
            {sponsor.county ? `, ${sponsor.county}` : ""}
          </div>

          <section>
            <h3 className="mb-2 text-sm font-medium text-ink">Sponsor rating</h3>
            <div className="flex flex-wrap gap-1.5">
              {sponsor.ratingTiers.map((tier) => (
                <RatingBadge key={tier} tier={tier} />
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-medium text-ink">Licensed for</h3>
            <div className="flex flex-wrap gap-1.5">
              {sponsor.types.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-muted"
                >
                  {type}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-medium text-ink">Visa routes</h3>
            <ul className="flex flex-col gap-1.5">
              {sponsor.routes.map((route) => (
                <li
                  key={route}
                  className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-ink"
                >
                  {route}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-auto rounded-[var(--radius-sm)] bg-surface p-4 text-sm text-ink-muted">
            This confirms {sponsor.organisationName} is currently listed as a
            licensed sponsor on the government&apos;s register. It doesn&apos;t
            confirm a specific job offer, or that any individual&apos;s visa
            application will succeed.
          </section>
        </div>
      </div>
    </div>
  );
}
