import { z } from "zod";

import { localToUtcIso } from "@/lib/google-calendar";

/**
 * Recurrence model shared by NL-created events (chat / parse) and syllabus
 * imports. We accept a structured object from Claude (validated with Zod)
 * rather than a raw RRULE string, then convert to RRULE here. Structured
 * input is easier to validate and lets us format a human-readable summary
 * for the confirmation card.
 */

const DAY_TO_RRULE: Record<string, string> = {
  Mon: "MO",
  Tue: "TU",
  Wed: "WE",
  Thu: "TH",
  Fri: "FR",
  Sat: "SA",
  Sun: "SU",
};

export const RECURRENCE_DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
export type RecurrenceDay = (typeof RECURRENCE_DAYS)[number];

export const recurrenceSchema = z
  .object({
    frequency: z.enum(["daily", "weekly", "monthly"]),
    byDay: z.array(z.enum(RECURRENCE_DAYS)).optional(),
    interval: z.number().int().min(1).max(99).optional(),
    until: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "until must be YYYY-MM-DD")
      .optional(),
    count: z.number().int().min(1).max(1000).optional(),
  })
  .refine((r) => !(r.until && r.count), {
    message: "Use `until` OR `count`, not both",
    path: ["until"],
  });

export type Recurrence = z.infer<typeof recurrenceSchema>;

/**
 * Build the Google Calendar RRULE string. UNTIL must be a UTC datetime
 * in the form YYYYMMDDTHHMMSSZ — we compute it from the user-local end-
 * of-day so "until Dec 15" means Dec 15 23:59 local, not 00:00 UTC.
 */
export function buildRRule(rec: Recurrence, tz: string): string {
  const freqMap = { daily: "DAILY", weekly: "WEEKLY", monthly: "MONTHLY" };
  const parts: string[] = [`FREQ=${freqMap[rec.frequency]}`];

  if (rec.interval && rec.interval > 1) {
    parts.push(`INTERVAL=${rec.interval}`);
  }

  if (rec.byDay && rec.byDay.length > 0) {
    const days = rec.byDay
      .map((d) => DAY_TO_RRULE[d])
      .filter(Boolean)
      .join(",");
    if (days) parts.push(`BYDAY=${days}`);
  }

  if (rec.until) {
    const untilUtc = localToUtcIso(`${rec.until}T23:59:59`, tz);
    parts.push(
      `UNTIL=${untilUtc.replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    );
  } else if (rec.count) {
    parts.push(`COUNT=${rec.count}`);
  }

  return `RRULE:${parts.join(";")}`;
}

/**
 * Human-readable summary for the confirmation card. Returns null if no
 * recurrence is set so callers can `if (summary)` and skip rendering.
 */
export function formatRecurrence(
  rec: Recurrence | undefined | null,
): string | null {
  if (!rec) return null;

  const parts: string[] = [];

  if (rec.frequency === "daily") {
    parts.push(
      rec.interval && rec.interval > 1
        ? `Every ${rec.interval} days`
        : "Repeats daily",
    );
  } else if (rec.frequency === "weekly") {
    const cadence =
      rec.interval && rec.interval > 1
        ? `every ${rec.interval} weeks`
        : "weekly";
    if (rec.byDay && rec.byDay.length > 0) {
      parts.push(`Repeats ${cadence} on ${rec.byDay.join(", ")}`);
    } else {
      parts.push(`Repeats ${cadence}`);
    }
  } else {
    parts.push(
      rec.interval && rec.interval > 1
        ? `Every ${rec.interval} months`
        : "Repeats monthly",
    );
  }

  if (rec.until) {
    const [y, m, d] = rec.until.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    parts.push(
      `until ${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`,
    );
  } else if (rec.count) {
    parts.push(`${rec.count} times`);
  }

  return parts.join(" · ");
}

/** JSON Schema for Claude's tool input — kept in sync with the Zod schema. */
export const RECURRENCE_TOOL_SCHEMA = {
  type: ["object", "null"] as const,
  description:
    "Set ONLY when the user described a recurring event ('every Monday', 'Tue/Thu', 'every weekday', 'every 2 weeks'). Omit/null for one-time events.",
  properties: {
    frequency: { type: "string", enum: ["daily", "weekly", "monthly"] },
    byDay: {
      type: "array",
      description: "Required for weekly recurrences. Day abbreviations.",
      items: {
        type: "string",
        enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      },
    },
    interval: {
      type: "integer",
      minimum: 1,
      description: "Every N units (default 1). e.g. 2 for biweekly.",
    },
    until: {
      type: "string",
      description:
        "End date in YYYY-MM-DD when the user implied one ('for the semester', 'until Dec 15', 'through finals'). Omit for indefinite.",
    },
    count: {
      type: "integer",
      minimum: 1,
      description:
        "Fixed number of occurrences. Alternative to `until`. Don't set both.",
    },
  },
  required: ["frequency"],
} as const;
