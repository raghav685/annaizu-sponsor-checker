// Pure diff engine: no DB/IO. Takes the current live state and this run's
// staged (parsed) state, returns exactly what changed. Kept side-effect-free
// on purpose so it's unit-testable in isolation from the sync orchestration.
//
// Phase 1 scope: added / removed / rating_changed / route_added / route_removed only.
// Rename/relocate detection is explicitly a LATER phase - a sponsor whose name
// changes will show up here as a plain removed+added pair. That's a known,
// accepted Phase 1 limitation (see docs/data-pipeline.md); sponsor_links exists
// so Phase 2 can retroactively reconcile these without touching sponsor_events.
//
// Identity: match_key (normalised org name) alone is NOT a unique identity -
// ~1,024 real organisations share an identical name across multiple towns
// (multi-branch operators). The natural key throughout this module is the
// composite `identityKey(matchKey, town)`.

export type SponsorStatus = "active" | "withdrawn" | "closed" | "unknown";
export type Rating = "A" | "B" | null;
export type RouteSponsorType = "Worker" | "Temporary Worker";
export type DiffEventType = "added" | "removed" | "rating_changed" | "route_added" | "route_removed";

export interface RouteState {
  route: string;
  rating: Rating;
  sponsorType: RouteSponsorType;
}

export interface CurrentSponsorState {
  id: string;
  matchKey: string;
  displayName: string;
  town: string;
  county: string;
  region: string;
  sector: string;
  status: SponsorStatus;
  nameVariants: string[];
  routes: RouteState[]; // only currently-active routes (is_current = true)
}

export interface StagedSponsorGroup {
  matchKey: string;
  displayName: string;
  town: string;
  county: string;
  region: string;
  sector: string;
  nameVariants: string[];
  routes: RouteState[];
}

export function identityKey(matchKey: string, town: string): string {
  return `${matchKey}::${town}`;
}

export interface DiffEvent {
  identityKey: string;
  eventType: DiffEventType;
  route?: string;
  before?: unknown;
  after?: unknown;
  notes?: string;
}

export type SponsorUpsertAction = "insert" | "reactivate" | "update" | "remove";

export interface SponsorUpsert {
  identityKey: string;
  matchKey: string;
  displayName: string;
  town: string;
  county: string;
  region: string;
  sector: string;
  nameVariants: string[];
  action: SponsorUpsertAction;
}

function unionVariants(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b]));
}

export type RouteChangeAction = "add" | "update_rating" | "deactivate";

export interface RouteChange {
  identityKey: string;
  route: string;
  rating: Rating;
  sponsorType: RouteSponsorType;
  action: RouteChangeAction;
}

export interface DiffResult {
  sponsorUpserts: SponsorUpsert[];
  routeChanges: RouteChange[];
  events: DiffEvent[];
  sponsorsActiveBefore: number;
  sponsorsAddedCount: number;
  sponsorsRemovedCount: number;
  sponsorsUpdatedCount: number;
  removalRatio: number;
}

function fullTuple(s: { displayName: string; town: string; county: string; region: string; sector: string; routes: RouteState[] }) {
  return {
    displayName: s.displayName,
    town: s.town,
    county: s.county,
    region: s.region,
    sector: s.sector,
    routes: s.routes,
  };
}

export function computeDiff(current: CurrentSponsorState[], staged: StagedSponsorGroup[]): DiffResult {
  const currentByKey = new Map(current.map((s) => [identityKey(s.matchKey, s.town), s]));
  const stagedByKey = new Map(staged.map((s) => [identityKey(s.matchKey, s.town), s]));
  const sponsorsActiveBefore = current.filter((s) => s.status === "active").length;

  const sponsorUpserts: SponsorUpsert[] = [];
  const routeChanges: RouteChange[] = [];
  const events: DiffEvent[] = [];
  let addedCount = 0;
  let removedCount = 0;
  const updatedKeys = new Set<string>();

  for (const s of staged.values()) {
    const key = identityKey(s.matchKey, s.town);
    const existing = currentByKey.get(key);
    const nameVariants = unionVariants(existing?.nameVariants ?? [], s.nameVariants);
    const base = { identityKey: key, matchKey: s.matchKey, displayName: s.displayName, town: s.town, county: s.county, region: s.region, sector: s.sector, nameVariants };

    if (!existing) {
      // Brand new sponsor - never seen before.
      sponsorUpserts.push({ ...base, action: "insert" });
      events.push({ identityKey: key, eventType: "added", after: fullTuple(s) });
      addedCount++;
      for (const r of s.routes) routeChanges.push({ identityKey: key, route: r.route, rating: r.rating, sponsorType: r.sponsorType, action: "add" });
      continue;
    }

    if (existing.status !== "active") {
      // Reappeared after a previous removal - matched by (match_key, town)
      // regardless of status. Always the SAME sponsor_id, a fresh `added`
      // event, never a new row.
      sponsorUpserts.push({ ...base, action: "reactivate" });
      events.push({ identityKey: key, eventType: "added", after: fullTuple(s), notes: "reappeared after previous removal" });
      addedCount++;
      for (const r of s.routes) routeChanges.push({ identityKey: key, route: r.route, rating: r.rating, sponsorType: r.sponsorType, action: "add" });
      continue;
    }

    // Still active - diff routes for this sponsor.
    let sponsorChanged = false;
    const currentRoutesByName = new Map(existing.routes.map((r) => [r.route, r]));
    const stagedRoutesByName = new Map(s.routes.map((r) => [r.route, r]));

    for (const r of s.routes) {
      const cur = currentRoutesByName.get(r.route);
      if (!cur) {
        routeChanges.push({ identityKey: key, route: r.route, rating: r.rating, sponsorType: r.sponsorType, action: "add" });
        events.push({ identityKey: key, eventType: "route_added", route: r.route, after: { route: r.route, rating: r.rating } });
        sponsorChanged = true;
      } else if (cur.rating !== r.rating) {
        routeChanges.push({ identityKey: key, route: r.route, rating: r.rating, sponsorType: r.sponsorType, action: "update_rating" });
        events.push({
          identityKey: key,
          eventType: "rating_changed",
          route: r.route,
          before: { rating: cur.rating },
          after: { rating: r.rating },
        });
        sponsorChanged = true;
      }
    }
    for (const r of existing.routes) {
      if (!stagedRoutesByName.has(r.route)) {
        routeChanges.push({ identityKey: key, route: r.route, rating: r.rating, sponsorType: r.sponsorType, action: "deactivate" });
        events.push({ identityKey: key, eventType: "route_removed", route: r.route, before: { route: r.route, rating: r.rating } });
        sponsorChanged = true;
      }
    }

    // Only write display fields (casing/county drift) if something actually
    // differs. Unconditionally upserting every unchanged sponsor on every run
    // is the whole cost of a "changed publish" regardless of how small the
    // real delta is - on ~127k sponsors that's the difference between a sync
    // touching a few hundred rows and one touching all of them every time.
    const fieldsChanged =
      s.displayName !== existing.displayName ||
      s.county !== existing.county ||
      s.region !== existing.region ||
      s.sector !== existing.sector ||
      nameVariants.length !== existing.nameVariants.length;
    if (fieldsChanged || sponsorChanged) {
      sponsorUpserts.push({ ...base, action: "update" });
    }
    if (sponsorChanged) updatedKeys.add(key);
  }

  for (const c of current) {
    const key = identityKey(c.matchKey, c.town);
    if (c.status === "active" && !stagedByKey.has(key)) {
      events.push({ identityKey: key, eventType: "removed", before: fullTuple(c) });
      removedCount++;
      sponsorUpserts.push({
        identityKey: key,
        matchKey: c.matchKey,
        displayName: c.displayName,
        town: c.town,
        county: c.county,
        region: c.region,
        sector: c.sector,
        nameVariants: c.nameVariants,
        action: "remove",
      });
      for (const r of c.routes) {
        routeChanges.push({ identityKey: key, route: r.route, rating: r.rating, sponsorType: r.sponsorType, action: "deactivate" });
      }
    }
  }

  return {
    sponsorUpserts,
    routeChanges,
    events,
    sponsorsActiveBefore,
    sponsorsAddedCount: addedCount,
    sponsorsRemovedCount: removedCount,
    sponsorsUpdatedCount: updatedKeys.size,
    removalRatio: sponsorsActiveBefore > 0 ? removedCount / sponsorsActiveBefore : 0,
  };
}
