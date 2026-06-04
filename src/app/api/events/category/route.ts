import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";

/**
 * PATCH /api/events/category
 * Body: { eventId, categoryId | null }
 *
 * Sets the cal_ai_category extended property on a Google Calendar event.
 * Pass categoryId=null (or omit) to clear the category.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { eventId?: string; categoryId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  // Google Calendar lets you "delete" an extendedProperty key by sending null.
  const patch = {
    extendedProperties: {
      private: {
        cal_ai_category: body.categoryId ?? null,
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
  // Tell Next.js that the dashboard's data behind this route is stale so
  // router.refresh() will actually re-fetch the events (not just re-render).
  revalidatePath("/dashboard");
  return NextResponse.json(updated);
}
