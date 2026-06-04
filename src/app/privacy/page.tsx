import Link from "next/link";

import { Nav } from "@/components/landing/nav";

/**
 * Public privacy page. Short, plain English. Linked from the dashboard
 * footer and ideally referenced when collecting consent.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <Nav />
      <main className="mx-auto max-w-2xl px-6 py-16 sm:px-10 sm:py-24">
        <div className="font-mono text-xs tracking-[0.22em] uppercase text-accent">
          Privacy
        </div>
        <h1 className="font-display mt-4 text-5xl tracking-tight">
          What Cal AI knows about you.
        </h1>

        <div className="prose prose-stone mt-10 max-w-none text-[16px] leading-relaxed text-ink-soft">
          <p>
            Cal AI is built to help students manage their calendar with as
            little surveillance as possible. This page tells you exactly what
            we collect, why, and how to get rid of it.
          </p>

          <h2 className="font-display mt-12 text-2xl text-ink">
            What we store
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              Your Google account&apos;s <strong>name and email</strong> — to
              sign you in.
            </li>
            <li>
              An <strong>OAuth access token</strong> for Google Calendar,
              encrypted in your session cookie. Used only to read and write
              events on your behalf.
            </li>
            <li>
              A <strong>usage log</strong> recording when you create / edit
              events and what you type into the chat assistant. We use this to
              improve scheduling suggestions over time. It does not include
              your full calendar history, only events you took action on
              inside Cal AI.
            </li>
          </ul>

          <h2 className="font-display mt-12 text-2xl text-ink">
            What we don&apos;t do
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>We don&apos;t sell your data. We don&apos;t advertise.</li>
            <li>
              We don&apos;t share your data with anyone. The only third party
              that sees your event text is Anthropic (Claude) when you use the
              chat assistant — they process the message and don&apos;t train
              on it.
            </li>
            <li>
              We don&apos;t read events on your calendar that you didn&apos;t
              create through Cal AI — we just fetch them to render your week
              view in your browser.
            </li>
          </ul>

          <h2 className="font-display mt-12 text-2xl text-ink">
            Your data, on your terms
          </h2>
          <p>
            You can download or wipe everything we&apos;ve logged about you at
            any time:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <Link
                href="/api/me/export"
                className="text-accent underline underline-offset-4"
              >
                Export my data
              </Link>{" "}
              — downloads a JSON file with every row we have for your account.
            </li>
            <li>
              To delete everything we&apos;ve logged, sign in, then visit{" "}
              <code className="rounded bg-cream-deep px-1.5 py-0.5 font-mono text-[13px]">
                /api/me/delete
              </code>{" "}
              with a POST request (we&apos;ll add a button for this soon).
            </li>
            <li>
              To stop using Cal AI entirely, sign out and revoke our access at{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-4"
              >
                Google Account Permissions
              </a>
              .
            </li>
          </ul>

          <p className="mt-12 font-mono text-[11px] tracking-wider uppercase text-muted">
            Last updated · {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </main>
    </div>
  );
}
