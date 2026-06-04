import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Single wide event log. Every user action becomes one row.
 *
 *   userId      — Google `sub` claim from the JWT (stable per user)
 *   kind        — 'event.created', 'event.updated', 'chat.message', ...
 *   payload     — flexible JSONB; whatever metadata is useful for that kind
 *
 * Rationale: JSONB lets us add new kinds without migrations. The (user, kind,
 * time) index covers the queries we'll actually want — "show me all
 * event.created rows for user X in time range Y". When we eventually go to
 * learn preferences, we'll query JSONB fields directly (`payload->>'type'`)
 * or materialize specific projections.
 */
export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull(),
  },
  (t) => [
    index("idx_user_kind_time").on(t.userId, t.kind, t.occurredAt),
    index("idx_kind_time").on(t.kind, t.occurredAt),
  ],
);

export type ActivityRow = typeof activityLog.$inferSelect;
export type NewActivityRow = typeof activityLog.$inferInsert;
