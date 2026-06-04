import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { activityLog } from "@/lib/db/schema";

/**
 * GET /api/me/export
 *
 * Returns all activity-log rows for the signed-in user as JSON. Lets
 * users see (and download) exactly what we've logged about them.
 *
 * Required for any responsible data practice + sets us up cleanly if
 * we ever need GDPR / CCPA compliance.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({
      user_id: session.user.id,
      exported_at: new Date().toISOString(),
      note: "No database configured; no data logged.",
      rows: [],
    });
  }

  const rows = await db
    .select()
    .from(activityLog)
    .where(eq(activityLog.userId, session.user.id));

  return NextResponse.json(
    {
      user_id: session.user.id,
      exported_at: new Date().toISOString(),
      row_count: rows.length,
      rows,
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="cal-ai-data-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    },
  );
}
