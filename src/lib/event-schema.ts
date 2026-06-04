import { z } from "zod";

import { recurrenceSchema } from "@/lib/recurrence";

/* ── shared building blocks ── */

const LOCAL_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

const titleField = z.string().min(1, "Title is required").max(200);
const dtField = z.string().regex(LOCAL_ISO, "Use YYYY-MM-DDTHH:MM[:SS]");
const locField = z.string().max(500).nullable().optional();
const descField = z.string().max(2000).nullable().optional();

/* ── full event (for create) ── */

export const eventSchema = z
  .object({
    title: titleField,
    start: dtField,
    end: dtField,
    location: locField,
    description: descField,
    /** Optional RRULE-style recurrence. Omitted for one-off events. */
    recurrence: recurrenceSchema.optional().nullable(),
  })
  .refine(
    (e) => new Date(e.end).getTime() > new Date(e.start).getTime(),
    { message: "end must be after start", path: ["end"] },
  );

export type ParsedEvent = z.infer<typeof eventSchema>;

/* ── partial updates ── */

export const eventUpdatesSchema = z
  .object({
    title: titleField.optional(),
    start: dtField.optional(),
    end: dtField.optional(),
    location: locField,
    description: descField,
  })
  .refine(
    (u) =>
      !u.start ||
      !u.end ||
      new Date(u.end).getTime() > new Date(u.start).getTime(),
    { message: "end must be after start", path: ["end"] },
  )
  .refine(
    (u) =>
      Object.values(u).some(
        (v) => v !== undefined && v !== null && v !== "",
      ),
    { message: "At least one field must change" },
  );

export type EventUpdates = z.infer<typeof eventUpdatesSchema>;

/* ── action payloads from the parser ── */

export const createActionSchema = z.object({
  action: z.literal("create"),
  event: eventSchema,
});

export const createManyActionSchema = z.object({
  action: z.literal("create_many"),
  groupTitle: z.string(),
  events: z.array(eventSchema),
  totalMinutes: z.number().optional(),
  scheduledMinutes: z.number().optional(),
});

export const updateActionSchema = z.object({
  action: z.literal("update"),
  eventId: z.string().min(1),
  eventTitle: z.string(),
  current: z.object({
    title: z.string(),
    start: z.string(),
    end: z.string(),
  }),
  updates: eventUpdatesSchema,
});

export const deleteActionSchema = z.object({
  action: z.literal("delete"),
  eventId: z.string().min(1),
  eventTitle: z.string(),
  current: z.object({
    title: z.string(),
    start: z.string(),
    end: z.string(),
  }),
});

export const clarifyActionSchema = z.object({
  action: z.literal("clarify"),
  question: z.string(),
  missing: z.array(z.string()).optional(),
});

export const parseResponseSchema = z.discriminatedUnion("action", [
  createActionSchema,
  createManyActionSchema,
  updateActionSchema,
  deleteActionSchema,
  clarifyActionSchema,
]);

export type ParseResponse = z.infer<typeof parseResponseSchema>;
export type CreateAction = z.infer<typeof createActionSchema>;
export type CreateManyAction = z.infer<typeof createManyActionSchema>;
export type UpdateAction = z.infer<typeof updateActionSchema>;
export type DeleteAction = z.infer<typeof deleteActionSchema>;
export type ClarifyAction = z.infer<typeof clarifyActionSchema>;
