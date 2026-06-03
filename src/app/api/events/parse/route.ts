import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { eventSchema } from "@/lib/event-schema";

/**
 * POST /api/events/parse
 *
 * Body: { text, timezone }
 *
 * Returns either:
 *   { type: "event", event }                    — parsed and validated
 *   { type: "needs_clarification", question }   — Claude couldn't infer
 *                                                 a required field
 *
 * Two tools are exposed to Claude. The `create_event` tool requires all
 * key fields. The `ask_clarification` tool lets Claude bail out with a
 * follow-up question when the user's input is ambiguous — rather than
 * silently defaulting to noon and getting it wrong.
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

  const anthropic = new Anthropic({ apiKey });

  const now = new Date();
  const nowIso = now.toISOString();
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
      max_tokens: 512,
      tools: [
        {
          name: "create_event",
          description:
            "Use this ONLY when you have all of: a clear title, a specific resolvable date, and a specific clock time. Never invent a default time or date.",
          input_schema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description:
                  "Concise event title in title case (e.g. 'Lunch with Sam', 'Dentist').",
              },
              start: {
                type: "string",
                description:
                  "Start datetime in LOCAL ISO 8601 with no timezone suffix: 'YYYY-MM-DDTHH:MM:SS'.",
              },
              end: {
                type: "string",
                description:
                  "End datetime in the same LOCAL ISO 8601 format. If the user didn't say a duration, default to 1 hour after start.",
              },
              location: {
                type: ["string", "null"],
                description: "Location if explicitly mentioned, else null.",
              },
              description: {
                type: ["string", "null"],
                description: "Notes if explicitly mentioned, else null.",
              },
            },
            required: ["title", "start", "end"],
          },
        },
        {
          name: "ask_clarification",
          description:
            "Use this when the user's input is missing or vague on time OR date. Ask one short, friendly follow-up question for the missing piece. Never guess.",
          input_schema: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description:
                  "One short, friendly question to surface the missing info (e.g. 'What time on Thursday?').",
              },
              missing: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["time", "date", "duration", "title"],
                },
                description: "Which fields are missing.",
              },
            },
            required: ["question"],
          },
        },
      ],
      system: `You convert natural-language sentences into calendar events.

Current local time: ${nowInTz} (${tz}).
UTC reference: ${nowIso}.

CRITICAL RULES:
- A "specific time" is a concrete clock time like "3pm", "3:30", "noon", "midnight", "9am". Vague terms like "morning", "afternoon", "evening", "lunch", "lunchtime", "tonight", "later" are NOT specific — call ask_clarification.
- A "specific date" is a resolvable date like "today", "tomorrow", "Tuesday", "next Tuesday", "June 5", "the 15th". Vague terms like "soon", "sometime", "next week", "this week" are NOT specific — call ask_clarification.
- Never invent defaults. If time OR date is ambiguous, use ask_clarification.
- When clarifying, quote the user's wording so they see what was incomplete (e.g. "What time on Thursday for 'lunch with Sam'?").
- When you have all info, call create_event with LOCAL ISO 8601 (no Z, no offset). Default duration to 1 hour if not specified.`,
      messages: [{ role: "user", content: text }],
    });

    const toolBlock = response.content.find(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolBlock) {
      return NextResponse.json(
        {
          error: "Couldn't parse — try rephrasing.",
        },
        { status: 422 },
      );
    }

    if (toolBlock.name === "ask_clarification") {
      const input = toolBlock.input as {
        question: string;
        missing?: string[];
      };
      return NextResponse.json({
        type: "needs_clarification",
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
      return NextResponse.json({ type: "event", event: parsed.data });
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
