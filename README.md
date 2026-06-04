# Cal AI

> Type your calendar. Cal AI handles the rest.

An AI calendar assistant for students. Connects to Google Calendar via OAuth and lets you create, edit, cancel, search, and reschedule events by typing the way you'd actually say them — *"dentist next Tuesday 3pm"*, *"move my 3pm to Friday"*, *"when am I free this week?"*, *"I need 6 hours to study for my chem final"*. You can also drop a course syllabus PDF and Cal AI extracts every class meeting, exam, and assignment date into your calendar in under a minute.

**🌐 Live:** [cal-ai-sigma.vercel.app](https://cal-ai-sigma.vercel.app)

![Demo](./public/demo.gif)

## Why it exists

The existing AI calendar tools (Motion, Reclaim, Akiflow) are designed for working professionals with too many meetings, charge $10-34/month, and ignore the way students actually use a calendar — semesters, syllabi, deadlines, group study, exam weeks. Cal AI is built for a student's schedule, treats course structure as a first-class concept, and is free.

## What it does

- **Sign in with Google** via OAuth 2.0 (narrowest possible scope) — with proper refresh-token rotation so sessions persist beyond an hour.
- **Natural-language event CRUD.** Type *"dentist next Tuesday 3pm for an hour"* / *"move my dentist to Friday at 4pm"* / *"cancel lunch Tuesday"* — Cal AI parses, validates, shows a confirmation card, then writes to Google Calendar.
- **Asks instead of guessing.** *"lunch with Sam Thursday"* triggers *"What time on Thursday?"* instead of silently defaulting to noon.
- **Conversational agent.** Ask *"when am I free this week?"* / *"when should I do laundry?"* / *"plan my Tuesday"* — Cal AI calls calendar-read tools transparently to gather context, answers in plain English, and proposes write actions you confirm.
- **Syllabus → semester in one click.** Upload a PDF syllabus → Claude (Sonnet 4.5 with document support) extracts course name, instructor, weekly meeting schedule, every exam/quiz/project/assignment with dates → editable preview → batch-creates everything (class meetings as recurring `RRULE` events, deadlines as timed/all-day events).
- **"How long do I have" study scheduling.** Say *"I need 4 hours for my chem final next Friday"* — Cal AI finds free slots, distributes 90-minute blocks across days within preferred hours, caps at 2 per day, returns a multi-event proposal you accept in one click.
- **Falling-behind nudge.** Dashboard scans the next 72 hours for events that look like deadlines (`[CS101]` brackets, "exam"/"assignment"/"due" keywords) — if you have one coming up without scheduled prep time, a banner suggests scheduling study time and pre-fills the chat for you.
- **Two views, real navigation.** Week-list view and full month-grid view; prev/today/next that updates URL search params (shareable, refreshable). Cmd+K opens a global search palette over the next 60 days of events.
- **Color coding by category.** Define your own categories (Class / Project / Personal / Misc + custom), each with one of 8 palette tones. Tag events from the popover. Filter the calendar by category from the header. Stored as Google Calendar extended properties so it persists across devices.
- **Event types** drive behavior. Mark something as `assignment` or `project` — it stays visible in the list view past its due date as **Overdue** even though everything else past today gets hidden.
- **Click an event → details popover** anchored to the event (scrolls with the page) with Type / Category pickers, Open-in-Google link, and Delete with confirmation. Drag any timed event between days on the month grid to reschedule.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, TypeScript) | Server + client unified; server components keep most pages low-JS |
| Auth | **Auth.js v5** (NextAuth) | OAuth 2.0 + JWT sessions; refresh-token rotation in the `jwt` callback |
| LLM | **Anthropic Claude API** — Haiku 4.5 (chat/parse) + Sonnet 4.5 (PDF syllabus extraction) | `tool_use` guarantees structured JSON; Sonnet's native PDF support reads syllabi directly |
| Validation | **Zod** | Runtime-validates every LLM response before any Google API write |
| Calendar | **Google Calendar API v3** — raw `fetch`, no SDK | Smaller bundle, fewer abstractions to debug, full control |
| UI | **Tailwind v4** + shadcn-style primitives + **framer-motion** (landing only) | Custom design system in cream/ink/terracotta with editorial typography |
| Host | **Vercel** | Free hobby tier; auto-deploys on `git push` |

## How it works

```
                                    ┌─────────────────┐
              ┌── find_free_slots ──│                 │
              │── list_events ──────│   Claude        │  agent loop
              │                     │   (tool_use)    │  read tools loop
              │   ┌─ create_event ──│                 │  write tools end
              │   │  update_event   │                 │  the turn with a
   ┌──────────┴───┴  delete_event   └─────────────────┘  pending action
   │ User     │  │  schedule_study
   │ types    │  │  ask_clarification
   │ NL       │  │
   └──────────┘  │
                 ▼
        ┌──────────────────┐         ┌──────────────────┐
        │ Zod validates    │         │  Confirmation    │
        │ ‒ rejects junk   │ ──────► │  card in chat    │
        │ ‒ end > start    │         │  thread          │
        └──────────────────┘         └────────┬─────────┘
                                              │ user confirms
                                              ▼
                                     ┌──────────────────┐
                                     │  Google Calendar │
                                     │  API             │
                                     │  POST/PATCH/DEL  │
                                     └──────────────────┘
```

## The interesting parts (interview material)

### 1. The LLM is treated as untrusted input

Every Claude `tool_use` response is Zod-validated server-side before any Google write. Bad shapes get rejected. The confirmation card shows the user exactly what was parsed — the LLM never writes directly.

```ts
// src/lib/event-schema.ts
const eventSchema = z.object({
  title: z.string().min(1).max(200),
  start: z.string().regex(LOCAL_ISO),
  end: z.string().regex(LOCAL_ISO),
  location: z.string().max(500).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
}).refine(e => new Date(e.end) > new Date(e.start));
```

### 2. Two tools so the model can ask for help

Most parsers silently default missing info ("lunch" → 12:00). That's how you get the wrong event on someone's calendar. Cal AI exposes `ask_clarification` as a peer tool to `create_event`. The system prompt is explicit: never invent a default, always ask.

```
"lunch with sam thursday"        →  Cal AI:  "What time on Thursday?"
"lunch with sam thursday 1pm"    →  parsed event, confirm card
"sometime this week"             →  Cal AI:  "Which day works?"
```

### 3. Edits resolve to real event IDs

When you say *"move my 3pm to Friday"*, the parse endpoint first fetches your upcoming events (next 4 weeks) and passes them to Claude as context — IDs, titles, times. Claude returns `update_event` with the actual event ID. The update API issues a `PATCH` to Google Calendar with only the changed fields. If the description matches multiple events, Claude calls `ask_clarification` to disambiguate.

### 4. Multi-tool agent loop for free-form chat

`/api/chat` runs Claude in a loop, up to 6 iterations. Claude can call read tools (`find_free_slots`, `list_events`) any number of times to gather information, then either answer in plain language or propose a write action that ends the turn. Read tool results stream back in as `tool_result` blocks the model can reason over.

```
User: "When should I do laundry?"
  → Claude calls find_free_slots(next 7 days, min 60 min)
  → Server returns 8 free slots
  → Claude: "Tuesday at 2pm looks open for an hour. Schedule it?"
User: "Yes"
  → Claude calls create_event proposal
  → User clicks Confirm
  → Event written to Google Calendar
```

### 5. Syllabus extraction via Claude's PDF support

Sonnet 4.5 accepts PDFs as document content blocks. Cal AI passes the syllabus + current local date, asks for one structured tool call (`import_syllabus`) returning `course.meetings` and `deadlines[]`. The import endpoint then batch-creates everything: classes become recurring events with `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=...`, deadlines become timed or all-day events. Partial failures don't roll back — the user sees what was created and what failed.

### 6. Timezones converted to UTC server-side

Sending Google a wall-clock time + a timezone *should* work, but mismatches between calendar primary tz / device tz / API interpretation make this fragile (I hit a real bug where 3pm Tokyo silently saved as 2am Tokyo). The fix is computing the actual UTC moment for the user's local time, by hand, with `Intl.DateTimeFormat`:

```ts
// src/lib/google-calendar.ts
export function localToUtcIso(localIso: string, tz: string): string {
  const guess = new Date(`${localIso}Z`);
  const wall = guess.toLocaleString("sv-SE", { timeZone: tz });
  const guessAsTz = new Date(`${wall.replace(" ", "T")}Z`);
  const offsetMs = guess.getTime() - guessAsTz.getTime();
  return new Date(guess.getTime() + offsetMs).toISOString();
}
```

Exactly one possible interpretation, every time. No date library installed.

### 7. OAuth lifecycle done properly

Most side projects stop at first sign-in. Cal AI does the full refresh dance: on every request, if the JWT's `expiresAt` is past (with a 60s buffer), POST to `oauth2.googleapis.com/token` with `grant_type=refresh_token`, mint a new access token, update the JWT. Errors surface via `session.error` so the UI can prompt re-sign-in instead of silently 401-ing.

### 8. Server / client boundaries done right

Pages that need both auth-aware nav AND interactive state split: server shell (auth + redirect + Nav) renders a client child that owns the state machine. Server actions for sign-in/out live in a dedicated `"use server"` file so they're importable from either context. (This took two build failures to learn the hard way.)

## Stats

- **~8,580 lines** of TypeScript / React / CSS
- **10 API routes**, **6 Claude tools**, **5 distinct LLM-driven features**
- **~30 React components**
- **Zero** date-handling dependencies (just `Intl.DateTimeFormat` and `Date`)

## Run locally

```bash
git clone https://github.com/ewang549/cal-ai.git
cd cal-ai
npm install
cp .env.example .env.local
# Fill in AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET, ANTHROPIC_API_KEY
npm run dev
```

You'll need:

- A **Google Cloud project** with the Calendar API enabled and OAuth credentials (Web app, redirect URI `http://localhost:3000/api/auth/callback/google`, `https://www.googleapis.com/auth/calendar.events` scope added to the consent screen)
- An **Anthropic API key** ([console.anthropic.com](https://console.anthropic.com))
- `openssl rand -base64 32` to generate `AUTH_SECRET`

Note: the production OAuth app is in Google's testing mode, so only emails added as **test users** on the consent screen can sign in.

## What I learned

- **OAuth scope behavior in test mode is treacherous.** Google sometimes reuses an old consent grant and silently drops newly-requested scopes. The recovery path (have the user revoke the app at `myaccount.google.com/permissions`) is unintuitive enough that the app needs a dedicated error state for it.
- **`tool_use` beats prompt-and-pray.** Started with "return JSON only" prompts and got ~95% reliability. Switching to `tool_use` with a strict input schema put it at 100% — no more regex rescue parsing.
- **Validation isn't optional just because the model is smart.** Even with tool_use, Zod catches `end < start`, overly long titles, and malformed dates. The safety check that prevents a bad event from getting created should never live in the model.
- **Multi-tool agents are stateful conversations between you and the model.** Each iteration of the loop is one "turn" where Claude can read, reason, and either respond or write. The architecture decision that mattered: read tools loop freely, write tools terminate the turn so the user can confirm.
- **Server/client boundaries in Next.js are a real architecture decision.** Mixing async server components and interactive client state inside the same file fails in non-obvious ways. The pattern is: outer server component for auth/layout, inner client component for state.
- **The biggest UX win was treating ambiguity as a first-class case.** The single addition of `ask_clarification` did more for product trust than any amount of confirmation UI polish.

## Roadmap

- [ ] **Recurring events via NL** — "every Monday at 9am", "weekdays for the next month"
- [ ] **Daily briefing email** — "today: 3 classes, 2 free blocks, 1 exam in 3 days"
- [ ] **Preference learning** — remember stable preferences ("you like focus blocks in the morning") in a small DB, feed into scheduling
- [ ] **Touch drag-to-reschedule** on mobile (HTML5 DnD doesn't work on touch)
- [ ] **Multi-calendar support** — beyond `primary`
- [ ] **Course-aware meeting prep** — Cal AI summarizes previous events with the same attendees before your next one

## License

MIT
