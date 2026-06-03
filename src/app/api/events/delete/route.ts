import { NextResponse } from "next/server";

import { auth } from "@/auth";

/**
 * POST /api/events/delete
 * Body: { eventId }
 *
 * Calls Google Calendar DELETE. Returns 204 on success.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { eventId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      body.eventId,
    )}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    },
  );

  // Google returns 204 No Content on successful delete; treat that as success.
  if (res.status !== 204 && !res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Google Calendar API ${res.status}: ${text.slice(0, 200)}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
