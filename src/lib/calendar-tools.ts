/**
 * Server-side implementations of read-only tools the chat agent can call.
 *
 * Each tool takes an OAuth access_token (from the session), executes against
 * Google Calendar, and returns a plain object the model can reason over.
 */

import {
  CalEvent,
  fetchEventsForRange,
  getEventEnd,
  getEventStart,
  localToUtcIso,
} from "@/lib/google-calendar";

export type FreeSlot = {
  start: string; // LOCAL ISO
  end: string; // LOCAL ISO
  durationMinutes: number;
};

/** Return events between two local-time ISO strings, formatted compactly. */
export async function listEventsTool(args: {
  rangeStart: string;
  rangeEnd: string;
  accessToken: string;
  tz: string;
}): Promise<Array<{ id: string; title: string; start: string; end: string }>> {
  const startUtc = new Date(localToUtcIso(args.rangeStart, args.tz));
  const endUtc = new Date(localToUtcIso(args.rangeEnd, args.tz));

  const events = await fetchEventsForRange(args.accessToken, startUtc, endUtc);

  return events.map((ev) => ({
    id: ev.id,
    title: ev.summary ?? "(no title)",
    start: toLocalIso(getEventStart(ev), args.tz),
    end: toLocalIso(getEventEnd(ev) ?? getEventStart(ev), args.tz),
  }));
}

/**
 * Compute free slots between rangeStart and rangeEnd that are at least
 * minDurationMinutes long, considering all events in the user's primary
 * calendar.
 */
export async function findFreeSlotsTool(args: {
  rangeStart: string;
  rangeEnd: string;
  minDurationMinutes: number;
  accessToken: string;
  tz: string;
}): Promise<FreeSlot[]> {
  const startUtc = new Date(localToUtcIso(args.rangeStart, args.tz));
  const endUtc = new Date(localToUtcIso(args.rangeEnd, args.tz));
  if (endUtc <= startUtc) return [];

  const events = await fetchEventsForRange(args.accessToken, startUtc, endUtc);

  // Build sorted busy intervals in UTC ms.
  const busy: Array<[number, number]> = events
    .map((ev): [number, number] => {
      const s = getEventStart(ev).getTime();
      const e = (getEventEnd(ev) ?? getEventStart(ev)).getTime();
      return [s, e];
    })
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);

  // Merge overlapping busy intervals.
  const merged: Array<[number, number]> = [];
  for (const [s, e] of busy) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }

  const free: FreeSlot[] = [];
  const minMs = args.minDurationMinutes * 60_000;
  let cursor = startUtc.getTime();
  for (const [s, e] of merged) {
    if (s > cursor) {
      const gap = s - cursor;
      if (gap >= minMs) {
        free.push(buildFreeSlot(cursor, s, args.tz));
      }
    }
    cursor = Math.max(cursor, e);
  }
  // Tail after the last busy interval
  const endMs = endUtc.getTime();
  if (endMs > cursor && endMs - cursor >= minMs) {
    free.push(buildFreeSlot(cursor, endMs, args.tz));
  }

  return free;
}

function buildFreeSlot(startMs: number, endMs: number, tz: string): FreeSlot {
  return {
    start: toLocalIso(new Date(startMs), tz),
    end: toLocalIso(new Date(endMs), tz),
    durationMinutes: Math.round((endMs - startMs) / 60_000),
  };
}

/** Format a UTC Date as a local-time ISO string in the given timezone. */
function toLocalIso(d: Date, tz: string): string {
  // "sv-SE" gives "YYYY-MM-DD HH:MM:SS" — close to ISO, just swap the space.
  const s = d.toLocaleString("sv-SE", { timeZone: tz });
  return s.replace(" ", "T");
}
