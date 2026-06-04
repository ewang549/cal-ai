import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { activityLog } from "@/lib/db/schema";

/**
 * POST /api/me/delete
 *
 * Wipes every activity_log row for the signed-in user. Does NOT delete
 * the Google Calendar events themselves — that's the user's calendar.
 * Only our internal usage telemetry.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ deleted: 0, note: "No database configured." });
  }

  await db.delete(activityLog).where(eq(activityLog.userId, session.user.id));

  return NextResponse.json({ ok: true, deleted_for_user: session.user.id });
}
