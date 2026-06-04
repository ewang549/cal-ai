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

/**
 * Build a set of study/work blocks for a task with a total time budget,
 * distributed across the user's free time before a deadline. Caps blocks
 * to preferred hours (8am–9pm by default) and respects a max-per-day rule
 * to avoid suggesting 6 hours of work back-to-back.
 */
export async function planStudyBlocks(args: {
  taskTitle: string;
  totalMinutes: number;
  deadline: string; // LOCAL ISO
  blockMinutes?: number;
  preferredHourStart?: number;
  preferredHourEnd?: number;
  maxBlocksPerDay?: number;
  accessToken: string;
  tz: string;
  nowOverride?: Date;
}): Promise<{
  blocks: Array<{ start: string; end: string }>;
  scheduledMinutes: number;
  totalMinutes: number;
}> {
  const blockMinutes = clampInt(args.blockMinutes ?? 90, 30, 180);
  const startHour = clampInt(args.preferredHourStart ?? 9, 0, 23);
  const endHour = clampInt(args.preferredHourEnd ?? 21, startHour + 1, 24);
  const maxBlocksPerDay = args.maxBlocksPerDay ?? 2;

  const now = args.nowOverride ?? new Date();
  const deadline = new Date(`${args.deadline}Z`); // treat as UTC-ish, we re-derive below
  // Better: convert deadline (local) → UTC properly
  const deadlineUtc = new Date(localToUtcIso(args.deadline, args.tz));

  // Fetch free slots from now → deadline.
  const nowLocal = toLocalIso(now, args.tz);
  const slots = await findFreeSlotsTool({
    rangeStart: nowLocal,
    rangeEnd: args.deadline,
    minDurationMinutes: 30,
    accessToken: args.accessToken,
    tz: args.tz,
  });

  const blocks: Array<{ start: string; end: string }> = [];
  const blocksOnDay = new Map<string, number>(); // YYYY-MM-DD -> count
  let remaining = args.totalMinutes;

  for (const slot of slots) {
    if (remaining <= 0) break;
    const slotStartUtc = new Date(localToUtcIso(slot.start, args.tz));
    const slotEndUtc = new Date(localToUtcIso(slot.end, args.tz));
    if (slotStartUtc >= deadlineUtc) break;

    // Walk through the slot in blockMinutes chunks within preferred hours.
    let cursor = new Date(slotStartUtc);
    const slotCeiling =
      slotEndUtc < deadlineUtc ? slotEndUtc : deadlineUtc;

    while (cursor < slotCeiling && remaining > 0) {
      const localCursor = new Date(
        cursor.toLocaleString("sv-SE", { timeZone: args.tz }).replace(" ", "T"),
      );
      const hour = localCursor.getHours();
      const dayKey = localCursor.toISOString().slice(0, 10);

      if (hour < startHour) {
        // jump to startHour today
        const next = new Date(localCursor);
        next.setHours(startHour, 0, 0, 0);
        const nextUtc = new Date(localToUtcIso(toLocalIso(next, args.tz), args.tz));
        cursor = nextUtc;
        continue;
      }
      if (hour >= endHour) {
        // jump to startHour next day
        const next = new Date(localCursor);
        next.setDate(next.getDate() + 1);
        next.setHours(startHour, 0, 0, 0);
        const nextUtc = new Date(localToUtcIso(toLocalIso(next, args.tz), args.tz));
        cursor = nextUtc;
        continue;
      }

      const used = blocksOnDay.get(dayKey) ?? 0;
      if (used >= maxBlocksPerDay) {
        // jump to startHour next day
        const next = new Date(localCursor);
        next.setDate(next.getDate() + 1);
        next.setHours(startHour, 0, 0, 0);
        cursor = new Date(localToUtcIso(toLocalIso(next, args.tz), args.tz));
        continue;
      }

      const allocate = Math.min(blockMinutes, remaining);
      const blockEnd = new Date(cursor.getTime() + allocate * 60_000);
      if (blockEnd > slotCeiling) break;
      // Also keep within preferred end hour
      const blockEndLocal = new Date(
        blockEnd.toLocaleString("sv-SE", { timeZone: args.tz }).replace(" ", "T"),
      );
      const endHourFractional =
        blockEndLocal.getHours() + blockEndLocal.getMinutes() / 60;
      if (endHourFractional > endHour) break;

      blocks.push({
        start: toLocalIso(cursor, args.tz),
        end: toLocalIso(blockEnd, args.tz),
      });
      blocksOnDay.set(dayKey, used + 1);
      remaining -= allocate;
      cursor = blockEnd;
    }
  }

  return {
    blocks,
    scheduledMinutes: args.totalMinutes - remaining,
    totalMinutes: args.totalMinutes,
  };
}

function clampInt(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(v)));
}

/* ─── nudges: detect at-risk deadlines ─── */

export type AtRiskDeadline = {
  id: string;
  title: string;
  startIso: string; // LOCAL ISO
  isAllDay: boolean;
};

const DEADLINE_KEYWORDS =
  /\b(due|exam|quiz|midterm|final|finals|paper|project|homework|assignment|deadline|test|presentation)\b/i;

/**
 * From a list of upcoming events, return those that look like deadlines
 * within the next `withinHours` hours. Heuristic: title contains a
 * deadline keyword OR is bracketed (typical syllabus import format).
 */
export function findAtRiskDeadlines(
  events: CalEvent[],
  withinHours = 72,
): AtRiskDeadline[] {
  const now = new Date();
  const horizon = new Date(now.getTime() + withinHours * 60 * 60 * 1000);

  const at: AtRiskDeadline[] = [];
  for (const ev of events) {
    const title = ev.summary ?? "";
    const isDeadline =
      DEADLINE_KEYWORDS.test(title) ||
      title.trimStart().startsWith("[");
    if (!isDeadline) continue;

    const iso = ev.start.dateTime ?? ev.start.date;
    if (!iso) continue;
    const start = new Date(iso);
    if (start <= now || start > horizon) continue;

    at.push({
      id: ev.id,
      title,
      startIso: iso,
      isAllDay: Boolean(ev.start.date && !ev.start.dateTime),
    });
  }
  // Sort by date ascending
  at.sort((a, b) => a.startIso.localeCompare(b.startIso));
  return at;
}
