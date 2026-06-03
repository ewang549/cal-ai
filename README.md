# Cal AI

> Type your calendar. Cal AI handles the rest.

A web app that connects to Google Calendar and lets you create, move, and cancel events by typing the way you'd say them out loud — *"dentist next Tuesday 3pm"*, *"move my 3pm to Friday"*, *"cancel lunch Tuesday"*. Claude parses your sentence into a structured event, the result is validated against a strict schema, and a confirmation card shows you exactly what will happen before anything touches your calendar.

**🌐 Live:** [cal-ai-sigma.vercel.app](https://cal-ai-sigma.vercel.app)

![Demo](./public/demo.gif)

## What it does

- **Google sign-in** via OAuth 2.0 with the narrowest possible Calendar scope
- **Plain-English event creation** — type *"dentist next Tuesday 3pm for an hour"* and Cal AI parses, confirms, and writes
- **Plain-English edit / delete** — *"move my 3pm to Friday"* or *"cancel lunch Tuesday"* — Cal AI matches the description to a real upcoming event and updates or removes it
- **Asks instead of guessing** — vague input like *"lunch with Sam Thursday"* (no time) triggers a follow-up question rather than silently defaulting
- **Two dashboard views** — week list and full month grid, with prev/next navigation that's shareable via URL
- **Confirms before any write** — every parse is shown back as a card with Confirm / Cancel

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, TypeScript) | Server + client in one repo, server components for low-JS pages |
| Auth | **Auth.js v5** (NextAuth) | Battle-tested OAuth flow, JWT sessions, type-safe |
| LLM | **Anthropic Claude API** (Haiku 4.5) | `tool_use` guarantees structured JSON output |
| Validation | **Zod** | Runtime-validates everything coming back from Claude before it touches Google |
| Calendar | **Google Calendar API v3** (raw `fetch`, no SDK) | Smaller bundle, fewer abstractions to debug |
| UI | **Tailwind v4** + shadcn-style primitives + **framer-motion** | Custom design system in cream/ink/terracotta with editorial typography |
| Host | **Vercel** | Free, auto-deploys on push, generous serverless limits |

## How it works

```
┌──────────┐    ┌────────────────┐    ┌────────────┐    ┌──────────────┐
│  User    │──> │ /api/events/   │──> │  Claude    │    │              │
│ types in │    │ parse          │    │  (tool_use)│    │  Google      │
│ NL       │    │ + upcoming     │<── │ ↓ JSON     │    │  Calendar    │
└──────────┘    │   events ctx   │    └────────────┘    │     API      │
                └────────────────┘                       │              │
                        │                                │              │
                        ▼                                │              │
                ┌────────────────┐                       │              │
                │ Zod validates  │                       │              │
                │ ‒ rejects junk │                       │              │
                └────────────────┘                       │              │
                        │                                │              │
                        ▼                                │              │
                ┌────────────────┐                       │              │
                │ User confirms  │──────────────────────>│              │
                │ in UI          │   /api/events/        │              │
                └────────────────┘   {create|update|     │              │
                                      delete}            └──────────────┘
```

## The interesting parts (the engineering)

### 1. The LLM is treated as untrusted input

Claude returns a JSON object via `tool_use`, but the server then runs it through a Zod schema before doing anything with it. Bad shapes get rejected. The confirmation card shows the user exactly what was parsed — the LLM never writes to the calendar directly.

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

### 2. Two tools, not one — so the LLM can ask for help

Most parsers silently default missing info (e.g. "lunch" → 12:00). That's how you get the wrong event on someone's calendar. Cal AI exposes **two** tools to Claude: `create_event` for full info, `ask_clarification` for missing info. The prompt explicitly says: never invent a default, always ask.

```
"lunch with sam thursday"  →  Cal AI:  "What time on Thursday?"
"lunch with sam thursday 1pm"  →  parsed event, confirm card
```

### 3. Edits resolve to real event IDs from your calendar

When you say *"move my 3pm to Friday"*, the parse endpoint first fetches your upcoming events (next 4 weeks) and passes them to Claude as context — IDs, titles, times. Claude can then return `update_event` with the actual event ID. The update API issues a `PATCH` to Google Calendar with only the changed fields.

If the description matches multiple events, Claude calls `ask_clarification` to disambiguate.

### 4. Timezones are converted to UTC server-side

Sending Google a wall-clock time + a timezone *should* work, but mismatches between calendar primary tz / device tz / API interpretation make this fragile. Instead, we compute the actual UTC moment for the user's local time and send that explicitly:

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

Exactly one possible interpretation, every time.

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

- A **Google Cloud project** with the Calendar API enabled and OAuth credentials (Web app, redirect URI `http://localhost:3000/api/auth/callback/google`)
- An **Anthropic API key** ([console.anthropic.com](https://console.anthropic.com))
- `openssl rand -base64 32` to generate `AUTH_SECRET`

Note: the app is in Google's OAuth testing mode, so only emails listed as **test users** in the consent screen can sign in. Add yourself, then anyone you want to share with.

## What I learned

Building this as my first real full-stack project taught me a few things that aren't in any tutorial:

- **OAuth scope behavior in test mode.** Google sometimes reuses an old consent grant and silently drops new scopes. The fix is having the user revoke the app in their account permissions and re-grant. I now reach for `prompt=consent` and explicit error UI as a default.
- **Why `tool_use` beats prompt-and-pray.** I started with "return JSON only" prompts and got 95% reliability. Switching to `tool_use` with a strict input schema put it at 100% — no more regex rescue parsing.
- **Date-fns isn't free, and `Intl` will do the job.** I built every date helper (week start/end, month grid, local→UTC) on `Intl.DateTimeFormat` and `Date` directly. No date library installed.
- **Validation isn't optional just because the model is smart.** Even with tool_use, Zod catches things like end-before-start and overly long titles. The check that prevents a bad event from being created shouldn't live in the model.

## Roadmap

- [ ] **Phase 4** — Conversational day planner. Cal AI asks a few questions and proposes a schedule using your free/busy slots
- [ ] **Recurring events** — handle "every Monday at 9am"
- [ ] **Drag-to-reschedule** on the month grid
- [ ] **Preference learning** — remember explainable preferences ("you like focus blocks in the morning") in a small DB

## License

MIT
