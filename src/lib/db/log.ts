import { db } from "@/lib/db/client";
import { activityLog } from "@/lib/db/schema";

/**
 * Best-effort instrumentation. Never throws — a logging failure should
 * never break a user-facing API call. If the database isn't configured
 * (no DATABASE_URL), the call is a no-op.
 *
 * Awaiting this adds ~30-80ms per request on Neon's HTTP driver. For most
 * routes that's acceptable. If perf becomes a concern, swap to fire-and-
 * forget with Vercel's `waitUntil`.
 */
export async function logActivity(
  userId: string | undefined | null,
  kind: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!db) return;
  if (!userId) return;
  try {
    await db.insert(activityLog).values({ userId, kind, payload });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("logActivity failed:", err);
  }
}
