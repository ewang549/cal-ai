import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { syllabusSchema, type Meeting, type Deadline } from "@/lib/syllabus-schema";
import { localToUtcIso } from "@/lib/google-calendar";
import { buildRRule } from "@/lib/recurrence";

/**
 * POST /api/syllabus/import
 * Body: { syllabus, timezone, selection?: { includeMeetings, includeDeadlines: string[] } }
 *
 * Batch-creates calendar events:
 *   - Each Meeting → recurring weekly event (RRULE) starting at firstMeeting, ending at lastMeeting.
 *   - Each Deadline → either a timed event (if dueTime) or an all-day event.
 *
 * Returns: { created: number, failed: number, errors: [...] }.
 * Partial failures don't roll back — we report what worked.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

type ImportBody = {
  syllabus?: unknown;
  timezone?: string;
  selection?: {
    includeMeetings?: boolean;
    includeDeadlines?: string[]; // titles, if omitted include all
  };
};


export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: ImportBody;
  try {
    body = (await req.json()) as ImportBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = syllabusSchema.safeParse(body.syllabus);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid syllabus payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const tz = body.timezone || "UTC";
  const { course, deadlines } = parsed.data;
  const selection = body.selection ?? {};
  const includeMeetings = selection.includeMeetings ?? true;
  const includeDeadlines: Set<string> | null = selection.includeDeadlines
    ? new Set(selection.includeDeadlines)
    : null;

  const created: string[] = [];
  const errors: { item: string; error: string }[] = [];

  // 1. Class meetings (recurring)
  if (includeMeetings) {
    for (const meeting of course.meetings) {
      const title = course.code
        ? `${course.code} · ${course.name}`
        : course.name;
      try {
        await createMeetingEvent({
          title,
          description: course.instructor
            ? `Instructor: ${course.instructor}`
            : undefined,
          meeting,
          tz,
          accessToken: session.accessToken,
        });
        created.push(`${title} (class)`);
      } catch (err) {
        errors.push({
          item: `${title} class meeting`,
          error: err instanceof Error ? err.message : "Unknown",
        });
      }
    }
  }

  // 2. Deadlines
  for (const deadline of deadlines) {
    if (includeDeadlines && !includeDeadlines.has(deadline.title)) continue;
    const title = course.code
      ? `[${course.code}] ${deadline.title}`
      : deadline.title;
    try {
      await createDeadlineEvent({
        title,
        description: deadline.description ?? undefined,
        deadline,
        tz,
        accessToken: session.accessToken,
      });
      created.push(title);
    } catch (err) {
      errors.push({
        item: title,
        error: err instanceof Error ? err.message : "Unknown",
      });
    }
  }

  return NextResponse.json({
    created: created.length,
    failed: errors.length,
    items: created,
    errors,
  });
}

/* ─── creators ─── */

async function createMeetingEvent(args: {
  title: string;
  description?: string;
  meeting: Meeting;
  tz: string;
  accessToken: string;
}) {
  const { title, description, meeting, tz, accessToken } = args;

  const startLocal = `${meeting.firstMeeting}T${meeting.startTime}:00`;
  const endLocal = `${meeting.firstMeeting}T${meeting.endTime}:00`;

  const startUtc = localToUtcIso(startLocal, tz);
  const endUtc = localToUtcIso(endLocal, tz);

  // Use the shared recurrence builder so syllabus imports and chat-created
  // recurring events produce identical RRULE strings.
  const rrule = buildRRule(
    {
      frequency: "weekly",
      byDay: meeting.days,
      until: meeting.lastMeeting,
    },
    tz,
  );

  const body = {
    summary: title,
    description,
    location: meeting.location ?? undefined,
    start: { dateTime: startUtc, timeZone: tz },
    end: { dateTime: endUtc, timeZone: tz },
    recurrence: [rrule],
  };

  await postGoogle(accessToken, body);
}

async function createDeadlineEvent(args: {
  title: string;
  description?: string;
  deadline: Deadline;
  tz: string;
  accessToken: string;
}) {
  const { title, description, deadline, tz, accessToken } = args;

  if (deadline.dueTime) {
    const startLocal = `${deadline.dueDate}T${deadline.dueTime}:00`;
    // Default to 1-hour block for timed deadlines (e.g. exams)
    const endLocal = addHoursToLocal(startLocal, 1);
    const startUtc = localToUtcIso(startLocal, tz);
    const endUtc = localToUtcIso(endLocal, tz);
    await postGoogle(accessToken, {
      summary: title,
      description,
      start: { dateTime: startUtc, timeZone: tz },
      end: { dateTime: endUtc, timeZone: tz },
    });
    return;
  }

  // All-day event: end.date is exclusive (next day).
  const nextDay = nextDateString(deadline.dueDate);
  await postGoogle(accessToken, {
    summary: title,
    description,
    start: { date: deadline.dueDate },
    end: { date: nextDay },
  });
}

async function postGoogle(accessToken: string, body: unknown) {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google ${res.status}: ${text.slice(0, 200)}`);
  }
}

function addHoursToLocal(localIso: string, hours: number): string {
  // Parse local ISO without TZ adjustment; just add ms and re-format.
  const [datePart, timePart] = localIso.split("T");
  const [Y, M, D] = datePart.split("-").map(Number);
  const [h, m, s] = timePart.split(":").map(Number);
  const d = new Date(Y, M - 1, D, h, m, s);
  d.setHours(d.getHours() + hours);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd}T${hh}:${mi}:00`;
}

function nextDateString(date: string): string {
  const [Y, M, D] = date.split("-").map(Number);
  const d = new Date(Y, M - 1, D);
  d.setDate(d.getDate() + 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
