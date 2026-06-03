/**
 * Thin client + date helpers for Google Calendar.
 *
 * No SDK — `fetch` with the OAuth access_token we stored on the session.
 */

export type CalEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  htmlLink?: string;
};

/* ─── date helpers ─── */

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

/** Sunday 00:00 of the week containing `d` (US convention). */
export function startOfWeek(d: Date = new Date()): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

/** Exclusive end — Sunday 00:00 of the following week. */
export function endOfWeek(d: Date = new Date()): Date {
  const r = startOfWeek(d);
  r.setDate(r.getDate() + 7);
  return r;
}

/** First day of the month at 00:00. */
export function startOfMonth(d: Date = new Date()): Date {
  const r = new Date(d);
  r.setDate(1);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** First day of the NEXT month (exclusive end). */
export function endOfMonth(d: Date = new Date()): Date {
  const r = startOfMonth(d);
  r.setMonth(r.getMonth() + 1);
  return r;
}

/** Sunday of the week containing the 1st — top-left cell of the month grid. */
export function startOfMonthGrid(d: Date = new Date()): Date {
  return startOfWeek(startOfMonth(d));
}

/** Exclusive end — Sunday after the last visible row of the month grid. */
export function endOfMonthGrid(d: Date = new Date()): Date {
  const lastDayOfMonth = new Date(endOfMonth(d));
  lastDayOfMonth.setDate(lastDayOfMonth.getDate() - 1);
  return endOfWeek(lastDayOfMonth);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Format a date to the "YYYY-MM-DD" string we use as the anchor param. */
export function toAnchorString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a "YYYY-MM-DD" anchor back into a Date (local midnight). */
export function fromAnchorString(s: string): Date {
  const [y, m, day] = s.split("-").map(Number);
  if (!y || !m || !day) return new Date();
  return new Date(y, m - 1, day);
}

/* ─── fetch ─── */

export async function fetchEventsForRange(
  accessToken: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<CalEvent[]> {
  const params = new URLSearchParams({
    timeMin: rangeStart.toISOString(),
    timeMax: rangeEnd.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Calendar API ${res.status}: ${text.slice(0, 200) || res.statusText}`,
    );
  }

  const data = (await res.json()) as { items?: CalEvent[] };
  return data.items ?? [];
}

/* ─── event introspection ─── */

export function getEventStart(event: CalEvent): Date {
  const iso = event.start.dateTime ?? event.start.date;
  return iso ? new Date(iso) : new Date();
}

export function getEventEnd(event: CalEvent): Date | null {
  const iso = event.end.dateTime ?? event.end.date;
  return iso ? new Date(iso) : null;
}

export function isAllDay(event: CalEvent): boolean {
  return Boolean(event.start.date && !event.start.dateTime);
}
