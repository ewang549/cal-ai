import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  findFreeSlotsTool,
  listEventsTool,
} from "@/lib/calendar-tools";
import {
  eventSchema,
  eventUpdatesSchema,
} from "@/lib/event-schema";
import {
  CalEvent,
  fetchEventsForRange,
  getEventEnd,
  getEventStart,
} from "@/lib/google-calendar";

/**
 * POST /api/chat
 *
 * Body: { messages: [{role, text}], timezone }
 *
 * Runs an agent loop with Claude. Claude can call read-only tools
 * (find_free_slots, list_events) any number of times to gather context.
 * For write actions, Claude calls a propose_* tool and the loop ends —
 * the proposed action is returned to the client for the user to confirm.
 *
 * Returns: { message, pendingAction? }
 *   - message: Claude's text reply
 *   - pendingAction: a CreateAction | UpdateAction | DeleteAction if Claude
 *     wants to write something
 */

type ClientMessage = { role: "user" | "assistant"; text: string };

const READ_TOOL_NAMES = new Set(["find_free_slots", "list_events"]);
const WRITE_TOOL_NAMES = new Set([
  "create_event",
  "update_event",
  "delete_event",
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { messages?: ClientMessage[]; timezone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const clientMessages = body.messages ?? [];
  const tz = body.timezone || "UTC";
  if (clientMessages.length === 0) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  // Snapshot upcoming events so update / delete can resolve to real ids.
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
    // Non-fatal: just can't update / delete by description.
  }

  const eventsContext = upcoming.length
    ? upcoming
        .slice(0, 50)
        .map((ev) => formatEventForPrompt(ev, tz))
        .join("\n")
    : "(no upcoming events in the next 4 weeks)";

  const nowInTz = now.toLocaleString("en-US", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const userName = session.user?.name?.split(" ")[0] ?? "there";

  const systemPrompt = `You are Cal AI, a friendly, concise personal calendar assistant for ${userName}.

Current local time: ${nowInTz} (${tz}).

The user's upcoming events (id | title | start → end):
${eventsContext}

WHAT YOU CAN DO
- Answer scheduling questions ("when am I free?", "what's on my calendar tomorrow?")
- Suggest times for tasks using find_free_slots
- Propose creating, updating, or deleting events — the user always confirms in the UI before anything is written

TOOL USAGE
- Use find_free_slots when the user asks where they have time, or when suggesting when to schedule something. ALWAYS prefer 8am-10pm local for suggestions (longer ranges are fine for "when am I free overall").
- Use list_events when the user asks what's already scheduled.
- Use create_event / update_event / delete_event to PROPOSE a write. The user confirms in the UI; you never write directly.
- For update_event and delete_event, the eventId MUST come from the upcoming events list above. If multiple events could match, use ask_clarification.
- Use ask_clarification when input is vague (no specific time, no specific date, or ambiguous reference).

STYLE
- Be conversational and concise. 1-3 short sentences is usually right.
- Format times naturally for the user ("3pm Tuesday", "Tuesday afternoon"). NEVER show raw ISO timestamps to the user.
- All tool inputs use LOCAL ISO 8601 with no timezone suffix: YYYY-MM-DDTHH:MM:SS.
- After a tool call, summarize the result in plain language. Don't dump the raw JSON.`;

  const anthropic = new Anthropic({ apiKey });

  // Build initial messages array for Claude.
  let messages: Anthropic.MessageParam[] = clientMessages.map((m) => ({
    role: m.role,
    content: m.text,
  }));

  const MAX_ITERATIONS = 6;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      tools: ALL_TOOLS,
      system: systemPrompt,
      messages,
    });

    const text = response.content
      .filter(
        (b): b is Anthropic.Messages.TextBlock => b.type === "text",
      )
      .map((b) => b.text)
      .join("\n")
      .trim();

    const toolUses = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );

    // No tools → final answer
    if (toolUses.length === 0) {
      return NextResponse.json({ message: text, pendingAction: null });
    }

    // Look for terminal tools (writes / clarification) — these end the loop.
    const writeProposal = toolUses.find((tu) =>
      WRITE_TOOL_NAMES.has(tu.name),
    );
    const clarification = toolUses.find(
      (tu) => tu.name === "ask_clarification",
    );

    if (clarification) {
      const input = clarification.input as { question?: string };
      return NextResponse.json({
        message: text || input.question || "Could you clarify?",
        pendingAction: null,
      });
    }

    if (writeProposal) {
      const action = buildActionFromProposal(writeProposal, upcoming);
      if (!action) {
        return NextResponse.json({
          message:
            text ||
            "I couldn't match that to an event. Which one did you mean?",
          pendingAction: null,
        });
      }
      return NextResponse.json({ message: text, pendingAction: action });
    }

    // Otherwise, execute read tools and continue.
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      if (!READ_TOOL_NAMES.has(tu.name)) continue;
      try {
        const result = await executeReadTool(
          tu.name,
          tu.input as Record<string, unknown>,
          session.accessToken,
          tz,
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        });
      } catch (err) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: `Error: ${err instanceof Error ? err.message : "unknown"}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  return NextResponse.json({
    message:
      "I got stuck working that out. Could you try rephrasing?",
    pendingAction: null,
  });
}

/* ─── tool definitions ─── */

const ALL_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "find_free_slots",
    description:
      "Find free time on the user's calendar between two local-time ISO timestamps. Returns slots that are at least minDurationMinutes long.",
    input_schema: {
      type: "object",
      properties: {
        rangeStart: {
          type: "string",
          description:
            "LOCAL ISO 8601 start of search range (e.g. '2026-06-09T08:00:00').",
        },
        rangeEnd: {
          type: "string",
          description: "LOCAL ISO 8601 end of search range.",
        },
        minDurationMinutes: {
          type: "integer",
          description: "Minimum slot duration in minutes.",
        },
      },
      required: ["rangeStart", "rangeEnd", "minDurationMinutes"],
    },
  },
  {
    name: "list_events",
    description:
      "List the user's calendar events between two local-time ISO timestamps.",
    input_schema: {
      type: "object",
      properties: {
        rangeStart: { type: "string" },
        rangeEnd: { type: "string" },
      },
      required: ["rangeStart", "rangeEnd"],
    },
  },
  {
    name: "create_event",
    description:
      "Propose creating a new event. The user will confirm in the UI before anything is written.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        start: {
          type: "string",
          description: "LOCAL ISO 8601 (YYYY-MM-DDTHH:MM:SS).",
        },
        end: { type: "string", description: "LOCAL ISO 8601." },
        location: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
      },
      required: ["title", "start", "end"],
    },
  },
  {
    name: "update_event",
    description:
      "Propose modifying an existing event. eventId MUST come from the upcoming events list in the system prompt.",
    input_schema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        updates: {
          type: "object",
          properties: {
            title: { type: "string" },
            start: { type: "string" },
            end: { type: "string" },
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
      "Propose cancelling/deleting an existing event by id from the upcoming events list.",
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
      "Use when the user's request is missing required info (specific time, specific date) OR when multiple events could match an update/delete request.",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string" },
      },
      required: ["question"],
    },
  },
];

/* ─── tool execution ─── */

async function executeReadTool(
  name: string,
  input: Record<string, unknown>,
  accessToken: string,
  tz: string,
): Promise<unknown> {
  if (name === "find_free_slots") {
    return findFreeSlotsTool({
      rangeStart: String(input.rangeStart),
      rangeEnd: String(input.rangeEnd),
      minDurationMinutes: Number(input.minDurationMinutes ?? 30),
      accessToken,
      tz,
    });
  }
  if (name === "list_events") {
    return listEventsTool({
      rangeStart: String(input.rangeStart),
      rangeEnd: String(input.rangeEnd),
      accessToken,
      tz,
    });
  }
  throw new Error(`Unknown read tool: ${name}`);
}

/* ─── action proposal builders ─── */

function buildActionFromProposal(
  tu: Anthropic.Messages.ToolUseBlock,
  upcoming: CalEvent[],
) {
  if (tu.name === "create_event") {
    const parsed = eventSchema.safeParse(tu.input);
    if (!parsed.success) return null;
    return { action: "create" as const, event: parsed.data };
  }

  if (tu.name === "update_event") {
    const input = tu.input as { eventId?: string; updates?: unknown };
    const target = upcoming.find((e) => e.id === input.eventId);
    if (!target) return null;
    const updates = eventUpdatesSchema.safeParse(input.updates);
    if (!updates.success) return null;
    return {
      action: "update" as const,
      eventId: target.id,
      eventTitle: target.summary ?? "(no title)",
      current: snapshotEvent(target),
      updates: updates.data,
    };
  }

  if (tu.name === "delete_event") {
    const input = tu.input as { eventId?: string };
    const target = upcoming.find((e) => e.id === input.eventId);
    if (!target) return null;
    return {
      action: "delete" as const,
      eventId: target.id,
      eventTitle: target.summary ?? "(no title)",
      current: snapshotEvent(target),
    };
  }

  return null;
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
  const s = start.toLocaleString("en-US", opts);
  const e = end ? end.toLocaleString("en-US", opts) : s;
  return `- id="${ev.id}" | "${ev.summary ?? "(no title)"}" | ${s} → ${e}`;
}
