"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { ChangelogEvent } from "@/lib/dataQueries";
import { eventLabel, eventDetail } from "@/lib/changelogFormat";

const EVENT_COLOR: Record<string, string> = {
  added: "text-signal",
  removed: "text-ember",
  rating_changed: "text-mist",
  route_added: "text-signal",
  route_removed: "text-ember",
};

function EventRow({ event }: { event: ChangelogEvent }) {
  const detail = eventDetail(event);
  const color = EVENT_COLOR[event.eventType] ?? "text-mist-dim";
  const name = event.sponsorIsActive ? (
    <Link href={`/sponsor/${event.sponsorSlug}`} className="text-mist hover:text-signal hover:underline">
      {event.sponsorName}
    </Link>
  ) : (
    <span className="text-mist">{event.sponsorName}</span>
  );

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-hairline py-2.5 font-mono text-xs last:border-b-0">
      <span className="text-mist-dim/60">{new Date(event.occurredAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
      {name}
      <span className={color}>{eventLabel(event.eventType)}</span>
      {detail && <span className="text-mist-dim">{detail}</span>}
      <span className="text-mist-dim/60">· {event.sponsorTown}</span>
    </div>
  );
}

export function EventsFeed({ initialEvents, total }: { initialEvents: ChangelogEvent[]; total: number }) {
  const [events, setEvents] = useState(initialEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/changelog/events?offset=${events.length}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: { events: ChangelogEvent[]; total: number } = await res.json();
      setEvents((prev) => [...prev, ...data.events]);
    } catch {
      setError("Couldn't load more events - try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassPanel elevation="base" className="p-4 lg:p-5">
      <div className="mb-1">{events.map((e) => <EventRow key={e.id} event={e} />)}</div>
      {events.length === 0 && <p className="py-4 text-center font-mono text-xs text-mist-dim">No events recorded yet.</p>}
      {events.length < total && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-xs text-mist transition-colors hover:border-signal/40 hover:text-signal disabled:opacity-50"
          >
            {loading ? "Loading…" : `Load more (${events.length.toLocaleString()} of ${total.toLocaleString()})`}
          </button>
          {error && <p className="font-mono text-[11px] text-ember">{error}</p>}
        </div>
      )}
    </GlassPanel>
  );
}
