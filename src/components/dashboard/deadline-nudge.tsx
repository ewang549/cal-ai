import Link from "next/link";
import { ArrowUpRight, AlertCircle } from "lucide-react";

import type { AtRiskDeadline } from "@/lib/calendar-tools";

const dayFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

/**
 * Banner shown on the dashboard when there are deadlines coming up in the
 * next ~72 hours that look like they could use some scheduled prep time.
 * Clicking the CTA jumps into the chat assistant with a draft prompt
 * pre-filled so the user just hits Go.
 */
export function DeadlineNudge({
  deadlines,
}: {
  deadlines: AtRiskDeadline[];
}) {
  if (deadlines.length === 0) return null;

  // Build a prompt for the chat assistant.
  const summary = deadlines
    .slice(0, 3)
    .map((d) => d.title)
    .join(", ");
  const promptText =
    deadlines.length === 1
      ? `Help me schedule study time for ${deadlines[0].title}`
      : `Help me schedule study time before my upcoming deadlines (${summary})`;
  const promptUrl = `/dashboard?prompt=${encodeURIComponent(promptText)}`;

  return (
    <section
      role="alert"
      aria-live="polite"
      className="mb-8 overflow-hidden rounded-2xl border border-amber-600/30 bg-amber-50/60"
    >
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
        <div
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-600 text-cream"
        >
          <AlertCircle className="size-5" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <div className="font-display text-lg tracking-tight text-ink">
            {deadlines.length === 1 ? (
              <>
                <span className="italic">Heads up</span> — your{" "}
                {deadlines[0].title} is coming up.
              </>
            ) : (
              <>
                <span className="italic">Heads up</span> —{" "}
                {deadlines.length} deadlines coming up in the next few days.
              </>
            )}
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] tracking-wider uppercase text-amber-900/80">
            {deadlines.slice(0, 3).map((d) => {
              const date = new Date(d.startIso);
              return (
                <li key={d.id} className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-amber-700" />
                  <span>{dayFmt.format(date)}</span>
                  {!d.isAllDay && <span>· {timeFmt.format(date)}</span>}
                  <span className="font-medium normal-case tracking-normal text-amber-950">
                    {d.title}
                  </span>
                </li>
              );
            })}
            {deadlines.length > 3 && (
              <li className="text-amber-900/60">
                +{deadlines.length - 3} more
              </li>
            )}
          </ul>
        </div>
        <Link
          href={promptUrl}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-cream shadow-[0_8px_24px_-12px_rgba(26,22,18,0.5)] transition-colors duration-200 hover:bg-ink-deep"
        >
          Schedule time
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}
