/**
 * Thin client for Google Calendar API.
 *
 * No SDK — just `fetch` with the OAuth access_token we stored on the
 * session. Keeps the dependency footprint small and makes the API call
 * easy to read.
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

/** Sunday 00:00 of the current week (US convention). */
export function startOfWeek(d: Date = new Date()): Date {
  const result = new Date(d);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Exclusive end — Sunday 00:00 of the following week. */
export function endOfWeek(d: Date = new Date()): Date {
  const result = startOfWeek(d);
  result.setDate(result.getDate() + 7);
  return result;
}

/** Fetch all single-instance events on the primary calendar for this week. */
export async function fetchWeekEvents(accessToken: string): Promise<CalEvent[]> {
  const params = new URLSearchParams({
    timeMin: startOfWeek().toISOString(),
    timeMax: endOfWeek().toISOString(),
    singleEvents: "true", // expand recurring events into instances
    orderBy: "startTime",
    maxResults: "100",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      // Never cache — we want fresh events every dashboard load.
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

/** Get a JS Date for an event, handling both timed and all-day events. */
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
