import { z } from "zod";

/**
 * The contract we accept from Claude AND require for Google Calendar writes.
 *
 * Datetimes are local-time ISO strings (no trailing Z / timezone offset)
 * because the timezone is supplied alongside them and applied at write time
 * by the Google Calendar API. This avoids subtle off-by-an-hour bugs around
 * DST transitions.
 */
export const eventSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title too long"),
    start: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
        "start must be ISO 8601 local time (YYYY-MM-DDTHH:MM[:SS])",
      ),
    end: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
        "end must be ISO 8601 local time (YYYY-MM-DDTHH:MM[:SS])",
      ),
    location: z.string().max(500).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
  })
  .refine(
    (e) => new Date(e.end).getTime() > new Date(e.start).getTime(),
    { message: "end must be after start", path: ["end"] },
  );

export type ParsedEvent = z.infer<typeof eventSchema>;
