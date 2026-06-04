import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { eventSchema } from "@/lib/event-schema";
import { localToUtcIso } from "@/lib/google-calendar";
import { buildRRule } from "@/lib/recurrence";

/**
 * POST /api/events/create
 *
 * Body: { ...event, timezone: string }
 *
 * Re-validates the event payload (server never trusts the client) and
 * POSTs it to Google Calendar. Returns the created event so the client
 * can show a confirmation.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tz = typeof body.timezone === "string" ? body.timezone : "UTC";

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid event payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const ev = parsed.data;

  // Convert local-wall-clock times to unambiguous UTC ISO before sending.
  // Avoids any ambiguity in how Google interprets dateTime + timeZone.
  const startUtc = localToUtcIso(ev.start, tz);
  const endUtc = localToUtcIso(ev.end, tz);

  const payload: Record<string, unknown> = {
    summary: ev.title,
    location: ev.location ?? undefined,
    description: ev.description ?? undefined,
    start: { dateTime: startUtc, timeZone: tz },
    end: { dateTime: endUtc, timeZone: tz },
  };
  if (ev.recurrence) {
    payload.recurrence = [buildRRule(ev.recurrence, tz)];
  }

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Google Calendar API ${res.status}: ${text.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const created = await res.json();
  return NextResponse.json(created);
}
