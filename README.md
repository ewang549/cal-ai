# Cal AI

> Your calendar, in plain English.

A web app that connects to Google Calendar and lets you create and rearrange events by typing naturally — "dentist next Tuesday at 3 for an hour." An LLM does the parsing; the code validates the output before writing anything to your real calendar.

## Status

In progress. Building phase by phase — each phase ends with something that works end-to-end and is deployed.

- [x] Phase 0 — Scaffold + deploy
- [ ] Phase 1 — Google login + read-only calendar view
- [ ] Phase 2 — Full event CRUD
- [ ] Phase 3 — Natural-language event creation (the headline feature)
- [ ] Phase 4 — Conversational day planner (stretch)
- [ ] Phase 5 — Preference learning (stretch+)

## Stack

- **Next.js 16** (App Router, TypeScript) — frontend + backend in one project
- **Tailwind CSS** — styling
- **NextAuth** — Google OAuth 2.0
- **Google Calendar API** — event read/write
- **Anthropic Claude API** — natural-language parsing into validated JSON
- **Vercel** — hosting

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Requires a `.env.local` with Google OAuth credentials and an Anthropic API key (not committed — see `.env.example` once Phase 1 lands).

## Why this exists

A summer project to learn end-to-end web development on something I'll actually use: OAuth, third-party API integration, full-stack TypeScript, and LLM tool-use with strict output validation.
