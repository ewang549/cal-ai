import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";

/**
 * POST /api/events/type
 * Body: { eventId, type: EventType | null }
 *
 * Sets the cal_ai_type extended property on a Google Calendar event.
 * Pass type=null to clear it.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { eventId?: string; type?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  const patch = {
    extendedProperties: {
      private: {
        cal_ai_type: body.type ?? null,
      },
    },
  };

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
  revalidatePath("/dashboard");
  return NextResponse.json(updated);
}
