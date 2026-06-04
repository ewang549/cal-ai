import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { logActivity } from "@/lib/db/log";
import { eventUpdatesSchema } from "@/lib/event-schema";
import { localToUtcIso } from "@/lib/google-calendar";

/**
 * POST /api/events/update
 * Body: { eventId, updates, timezone }
 *
 * Sends a PATCH to Google Calendar with only the fields that changed.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { eventId?: string; updates?: unknown; timezone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  const tz = typeof body.timezone === "string" ? body.timezone : "UTC";

  const parsed = eventUpdatesSchema.safeParse(body.updates);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid updates", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const u = parsed.data;
  const patch: Record<string, unknown> = {};
  if (u.title) patch.summary = u.title;
  if (u.location !== undefined) patch.location = u.location ?? null;
  if (u.description !== undefined) patch.description = u.description ?? null;
  // Convert local-wall-clock to UTC to remove any tz ambiguity.
  if (u.start)
    patch.start = { dateTime: localToUtcIso(u.start, tz), timeZone: tz };
  if (u.end)
    patch.end = { dateTime: localToUtcIso(u.end, tz), timeZone: tz };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      body.eventId,
    )}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Google Calendar API ${res.status}: ${text.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const updated = await res.json();

  await logActivity(session.user?.id, "event.updated", {
    google_event_id: body.eventId,
    changed_fields: Object.keys(u).filter(
      (k) => u[k as keyof typeof u] !== undefined,
    ),
    new_title: u.title ?? null,
    new_start: u.start ?? null,
    new_end: u.end ?? null,
    tz,
  });

  return NextResponse.json(updated);
}
