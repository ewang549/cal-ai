import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  eventSchema,
  eventUpdatesSchema,
} from "@/lib/event-schema";
import { RECURRENCE_TOOL_SCHEMA } from "@/lib/recurrence";
import {
  CalEvent,
  fetchEventsForRange,
  getEventEnd,
  getEventStart,
} from "@/lib/google-calendar";

/**
 * POST /api/events/parse
 *
 * Routes a natural-language sentence to one of four actions:
 *   - create        (the user wants a new event)
 *   - update        (modify an existing event by id)
 *   - delete        (cancel an existing event by id)
 *   - clarify       (model needs more info)
 *
 * To enable update / delete, we first fetch the user's upcoming events
 * (next 4 weeks) and pass them as context so Claude can match the
 * user's description to a concrete event id.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { text?: string; timezone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  const tz = body.timezone || "UTC";
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 },
    );
  }

  // Pull upcoming events so the model can reference them by id.
  const now = new Date();
  const fourWeeksOut = new Date(now);
  fourWeeksOut.setDate(fourWeeksOut.getDate() + 28);

  let upcoming: CalEvent[] = [];
  try {
    upcoming = await fetchEventsForRange(
      session.accessToken,
      now,
      fourWeeksOut,
    );
  } catch {
    // Non-fatal: model just won't be able to update/delete; create still works.
  }

  const eventsContext = upcoming.length
    ? upcoming
        .slice(0, 50)
        .map((ev) => formatEventForPrompt(ev, tz))
        .join("\n")
    : "(no upcoming events in the next 4 weeks)";

  const anthropic = new Anthropic({ apiKey });

  const nowInTz = now.toLocaleString("en-US", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 768,
      tools: [
        {
          name: "create_event",
          description:
            "Use when the user wants to add a NEW event (one-time OR recurring) AND you have a clear title, a specific date, and a specific clock time. For recurring patterns ('every Mon/Wed/Fri', 'weekly'), set the `recurrence` object — `start` is then the FIRST occurrence.",
          input_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              start: {
                type: "string",
                description:
                  "LOCAL ISO 8601 (YYYY-MM-DDTHH:MM:SS) — no Z. For recurring events this is the first occurrence.",
              },
              end: {
                type: "string",
                description: "LOCAL ISO 8601. Default 1h after start.",
              },
              location: { type: ["string", "null"] },
              description: { type: ["string", "null"] },
              recurrence: RECURRENCE_TOOL_SCHEMA,
            },
            required: ["title", "start", "end"],
          },
        },
        {
          name: "update_event",
          description:
            "Use when the user wants to MODIFY one of their upcoming events. eventId MUST come from the events list provided in the system prompt.",
          input_schema: {
            type: "object",
            properties: {
              eventId: {
                type: "string",
                description: "Exact id from the upcoming events list.",
              },
              updates: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  start: {
                    type: "string",
                    description: "LOCAL ISO 8601 (only if changing).",
                  },
                  end: {
                    type: "string",
                    description: "LOCAL ISO 8601 (only if changing).",
                  },
                  location: { type: ["string", "null"] },
                  description: { type: ["string", "null"] },
                },
              },
            },
            required: ["eventId", "updates"],
          },
        },
        {
          name: "delete_event",
          description:
            "Use when the user wants to CANCEL/DELETE/REMOVE one of their upcoming events.",
          input_schema: {
            type: "object",
            properties: {
              eventId: { type: "string" },
            },
            required: ["eventId"],
          },
        },
        {
          name: "ask_clarification",
          description:
            "Use when input is too vague to act on, OR when multiple existing events could match an update/delete request.",
          input_schema: {
            type: "object",
            properties: {
              question: { type: "string" },
              missing: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["question"],
          },
        },
      ],
      system: `You convert natural-language sentences into calendar actions.

Current local time: ${nowInTz} (${tz}).

The user's upcoming events (id | title | start → end):
${eventsContext}

RULES
- A "specific time" is a concrete clock time ("3pm", "noon", "9:30"). Vague terms ("morning", "lunch", "tonight") are NOT specific.
- A "specific date" is resolvable ("today", "tomorrow", "Tuesday", "June 5"). Vague terms ("soon", "sometime", "next week") are NOT.
- For CREATE: never invent defaults — call ask_clarification when time OR date is ambiguous.
- For UPDATE/DELETE: match the user's description to exactly one event in the list above. If multiple could match, call ask_clarification with options. If none match, call ask_clarification.
- All datetimes you emit are LOCAL ISO 8601 (YYYY-MM-DDTHH:MM:SS, no trailing Z, no offset).
- For update_event, ONLY include the fields that are actually changing in the "updates" object.

RECURRING EVENTS:
- If the user describes a pattern ("every Monday", "Tue/Thu at 10", "every weekday", "every 2 weeks on Wed", "weekly meeting"), set the \`recurrence\` object on create_event.
- The \`start\` field is the FIRST occurrence — pick the next upcoming date that matches the pattern (e.g. "every Tuesday" + today is Saturday → start on the next Tuesday).
- Set \`until\` when the user implied an end ("for the semester" → ~16 weeks out, "until finals" → typical exam week). Omit for indefinite.
- A recurring event still needs a specific clock time — if the user gave a day but no time, ask_clarification.`,
      messages: [{ role: "user", content: text }],
    });

    const toolBlock = response.content.find(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolBlock) {
      return NextResponse.json(
        { error: "Couldn't parse — try rephrasing." },
        { status: 422 },
      );
    }

    if (toolBlock.name === "ask_clarification") {
      const input = toolBlock.input as {
        question: string;
        missing?: string[];
      };
      return NextResponse.json({
        action: "clarify",
        question: input.question,
        missing: input.missing ?? [],
      });
    }

    if (toolBlock.name === "create_event") {
      const parsed = eventSchema.safeParse(toolBlock.input);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: "Parsed event failed validation.",
            issues: parsed.error.issues,
          },
          { status: 422 },
        );
      }
      return NextResponse.json({ action: "create", event: parsed.data });
    }

    if (toolBlock.name === "update_event") {
      const input = toolBlock.input as {
        eventId?: string;
        updates?: unknown;
      };
      const target = upcoming.find((e) => e.id === input.eventId);
      if (!target) {
        return NextResponse.json({
          action: "clarify",
          question:
            "I couldn't find that event in your upcoming calendar. Which one did you mean?",
        });
      }
      const updates = eventUpdatesSchema.safeParse(input.updates);
      if (!updates.success) {
        return NextResponse.json(
          {
            error: "Update payload invalid.",
            issues: updates.error.issues,
          },
          { status: 422 },
        );
      }
      return NextResponse.json({
        action: "update",
        eventId: target.id,
        eventTitle: target.summary ?? "(no title)",
        current: snapshotEvent(target),
        updates: updates.data,
      });
    }

    if (toolBlock.name === "delete_event") {
      const input = toolBlock.input as { eventId?: string };
      const target = upcoming.find((e) => e.id === input.eventId);
      if (!target) {
        return NextResponse.json({
          action: "clarify",
          question:
            "I couldn't find that event in your upcoming calendar. Which one did you mean?",
        });
      }
      return NextResponse.json({
        action: "delete",
        eventId: target.id,
        eventTitle: target.summary ?? "(no title)",
        current: snapshotEvent(target),
      });
    }

    return NextResponse.json(
      { error: "Unexpected tool call" },
      { status: 500 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Parse failed: ${message}` },
      { status: 500 },
    );
  }
}

function snapshotEvent(ev: CalEvent) {
  const s = getEventStart(ev);
  const e = getEventEnd(ev);
  return {
    title: ev.summary ?? "(no title)",
    start: localIso(s),
    end: e ? localIso(e) : localIso(s),
  };
}

function localIso(d: Date): string {
  // Convert a Date to local-time ISO without timezone suffix.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}:00`;
}

function formatEventForPrompt(ev: CalEvent, tz: string): string {
  const start = getEventStart(ev);
  const end = getEventEnd(ev);
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  const startStr = start.toLocaleString("en-US", opts);
  const endStr = end ? end.toLocaleString("en-US", opts) : startStr;
  return `- id="${ev.id}" | "${ev.summary ?? "(no title)"}" | ${startStr} → ${endStr}`;
}
