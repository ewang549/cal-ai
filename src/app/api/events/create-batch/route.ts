import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { eventSchema } from "@/lib/event-schema";
import { localToUtcIso } from "@/lib/google-calendar";

/**
 * POST /api/events/create-batch
 * Body: { events: ParsedEvent[], timezone }
 *
 * Creates each event sequentially on Google Calendar. Partial failures
 * don't roll back — returns a summary of what worked and what didn't.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { events?: unknown; timezone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty events array" },
      { status: 400 },
    );
  }

  const tz = body.timezone || "UTC";
  const validated = [];
  for (const ev of body.events) {
    const parsed = eventSchema.safeParse(ev);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid event in batch", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    validated.push(parsed.data);
  }

  let created = 0;
  const errors: { title: string; error: string }[] = [];

  for (const ev of validated) {
    try {
      const startUtc = localToUtcIso(ev.start, tz);
      const endUtc = localToUtcIso(ev.end, tz);
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: ev.title,
            location: ev.location ?? undefined,
            description: ev.description ?? undefined,
            start: { dateTime: startUtc, timeZone: tz },
            end: { dateTime: endUtc, timeZone: tz },
          }),
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status}: ${text.slice(0, 100)}`);
      }
      created++;
    } catch (err) {
      errors.push({
        title: ev.title,
        error: err instanceof Error ? err.message : "Unknown",
      });
    }
  }

  return NextResponse.json({
    created,
    failed: errors.length,
    errors,
  });
}
