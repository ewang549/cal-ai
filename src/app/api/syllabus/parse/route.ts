import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { syllabusSchema } from "@/lib/syllabus-schema";

/**
 * POST /api/syllabus/parse
 *
 * Two ways to call:
 *  - multipart/form-data with a `file` field (PDF up to ~10MB)
 *  - application/json with { text: string }
 *
 * Returns the validated structured syllabus, or 422 if Claude can't
 * extract enough.
 */

export const runtime = "nodejs";
export const maxDuration = 60; // syllabus PDFs take a few seconds

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  // Build the user content block — either a PDF document or plain text.
  const contentType = req.headers.get("content-type") || "";
  let userContent: Anthropic.Messages.ContentBlockParam[] = [];
  let timezone = "UTC";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");
    const tz = formData.get("timezone");
    if (tz && typeof tz === "string") timezone = tz;

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Missing PDF file" },
        { status: 400 },
      );
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "PDF too large — keep under 10MB" },
        { status: 413 },
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    userContent = [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      },
      {
        type: "text",
        text: "Extract this syllabus into the structured format. Today's date is " +
          new Date().toLocaleDateString("en-US", {
            timeZone: timezone,
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }) +
          ".",
      },
    ];
  } else {
    let body: { text?: string; timezone?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body.text || body.text.trim().length < 100) {
      return NextResponse.json(
        { error: "Paste at least the meeting times and deadlines section." },
        { status: 400 },
      );
    }
    if (body.timezone) timezone = body.timezone;
    userContent = [
      {
        type: "text",
        text: `Extract this syllabus into the structured format. Today's date is ${new Date().toLocaleDateString(
          "en-US",
          {
            timeZone: timezone,
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          },
        )}.\n\nSYLLABUS TEXT:\n${body.text}`,
      },
    ];
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      tools: [SYLLABUS_TOOL],
      tool_choice: { type: "tool", name: "import_syllabus" },
      system: `You are a syllabus parser for a college student's calendar app.

Extract:
  - The course (name, code, instructor, term, weekly meeting schedule).
  - Every deadline: exams, assignments, projects, quizzes, presentations.

RULES
- All dates must be specific calendar dates in YYYY-MM-DD form. If the syllabus only says "Week 4 lecture", resolve it using the term start date you can infer (term names like "Fall 2025" / "Spring 2026" + typical academic calendars).
- For class meetings, set firstMeeting and lastMeeting to the actual start/end dates of the term. Use sensible defaults if the syllabus is silent: ~14 weeks of class meetings.
- Use 24-hour HH:MM time format. If a deadline doesn't specify a time, leave dueTime null (it'll be created as all-day).
- Use the day abbreviations: Mon, Tue, Wed, Thu, Fri, Sat, Sun.
- For deadline type, pick the most specific match.
- If the syllabus is too vague to extract a course or any deadlines, you may still call the tool with what you can extract — even just the course meetings is valuable.`,
      messages: [{ role: "user", content: userContent }],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) {
      return NextResponse.json(
        {
          error:
            "Couldn't extract any structured info. Try pasting the meeting times + deadlines explicitly.",
        },
        { status: 422 },
      );
    }

    const parsed = syllabusSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Parsed syllabus failed validation.",
          issues: parsed.error.issues,
        },
        { status: 422 },
      );
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Parse failed: ${message}` },
      { status: 500 },
    );
  }
}

const SYLLABUS_TOOL: Anthropic.Messages.Tool = {
  name: "import_syllabus",
  description:
    "Extract a syllabus's class meeting schedule and all deadlines into a structured format the calendar app can use.",
  input_schema: {
    type: "object",
    properties: {
      course: {
        type: "object",
        properties: {
          name: { type: "string", description: "Course title" },
          code: {
            type: ["string", "null"],
            description: "Course code like 'CS 101'",
          },
          instructor: { type: ["string", "null"] },
          term: {
            type: ["string", "null"],
            description: "e.g. 'Fall 2025', 'Spring 2026'",
          },
          meetings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                days: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                  },
                },
                startTime: {
                  type: "string",
                  description: "HH:MM in 24-hour local time",
                },
                endTime: { type: "string" },
                location: { type: ["string", "null"] },
                firstMeeting: {
                  type: "string",
                  description: "YYYY-MM-DD of first class meeting",
                },
                lastMeeting: {
                  type: "string",
                  description: "YYYY-MM-DD of last class meeting",
                },
              },
              required: [
                "days",
                "startTime",
                "endTime",
                "firstMeeting",
                "lastMeeting",
              ],
            },
          },
        },
        required: ["name", "meetings"],
      },
      deadlines: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "exam",
                "assignment",
                "project",
                "quiz",
                "reading",
                "presentation",
                "other",
              ],
            },
            title: { type: "string" },
            dueDate: { type: "string", description: "YYYY-MM-DD" },
            dueTime: {
              type: ["string", "null"],
              description: "HH:MM if a specific time, else null",
            },
            description: { type: ["string", "null"] },
          },
          required: ["type", "title", "dueDate"],
        },
      },
    },
    required: ["course", "deadlines"],
  },
};
