import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  CalEvent,
  endOfWeek,
  getEventEnd,
  getEventStart,
  isAllDay,
  startOfWeek,
} from "@/lib/google-calendar";

const dayHeaderFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
const rangeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function groupByDay(events: CalEvent[]): Map<string, CalEvent[]> {
  const map = new Map<string, CalEvent[]>();
  for (const ev of events) {
    const key = getEventStart(ev).toDateString();
    const list = map.get(key) ?? [];
    list.push(ev);
    map.set(key, list);
  }
  return map;
}

export function WeekView({
  events,
  error,
  userName,
}: {
  events: CalEvent[];
  error: string | null;
  userName: string | null;
}) {
  const start = startOfWeek();
  const end = endOfWeek();
  const lastDay = new Date(end);
  lastDay.setDate(lastDay.getDate() - 1);

  return (
    <>
      <header className="mb-12">
        <div className="font-mono text-xs tracking-[0.22em] uppercase text-accent">
          {userName ? `Hi, ${userName.split(" ")[0]} —` : "This week"}
        </div>
        <h1 className="font-display mt-3 text-5xl tracking-tight text-ink sm:text-6xl">
          {rangeFmt.format(start)} – {rangeFmt.format(lastDay)}
        </h1>
        <p className="mt-3 text-ink-soft">
          {error
            ? "We couldn't reach your calendar."
            : `${events.length} ${events.length === 1 ? "event" : "events"} on your calendar.`}
        </p>
      </header>

      {error ? (
        <ErrorCard error={error} />
      ) : events.length === 0 ? (
        <EmptyState />
      ) : (
        <DayList eventsByDay={groupByDay(events)} weekStart={start} />
      )}
    </>
  );
}

function ErrorCard({ error }: { error: string }) {
  const isScopeIssue =
    error.includes("403") ||
    /scope|permission/i.test(error);

  return (
    <div className="rounded-2xl border border-rule bg-surface px-6 py-10 sm:px-10">
      <h2 className="font-display text-3xl italic text-ink sm:text-4xl">
        {isScopeIssue
          ? "Calendar permission missing."
          : "Couldn't reach your calendar."}
      </h2>

      {isScopeIssue ? (
        <>
          <p className="mt-4 max-w-prose leading-relaxed text-ink-soft">
            Google didn&apos;t grant the calendar scope on sign-in — usually because
            of a stale permission from a previous test. Quick fix:
          </p>
          <ol className="mt-5 max-w-prose list-decimal space-y-2 pl-5 text-[15px] text-ink-soft">
            <li>
              Open{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-4"
              >
                your Google account permissions
              </a>
              .
            </li>
            <li>
              Find <strong>Cal AI Assistant</strong> in the list and click{" "}
              <strong>Remove access</strong>.
            </li>
            <li>
              Come back here and click <strong>Sign out &amp; try again</strong>{" "}
              — you&apos;ll see the full consent screen, including calendar access.
            </li>
          </ol>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
            className="mt-7"
          >
            <Button type="submit" size="lg">
              Sign out &amp; try again
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-4 max-w-prose leading-relaxed text-ink-soft">
            Something went wrong fetching events. The raw error is below — paste it
            in if you need help diagnosing.
          </p>
          <pre className="mt-4 max-w-full overflow-x-auto rounded-lg bg-ink-deep p-4 font-mono text-xs text-cream">
            {error}
          </pre>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-rule bg-surface px-6 py-16 text-center">
      <h2 className="font-display text-3xl italic text-ink-soft">
        Nothing scheduled.
      </h2>
      <p className="mt-3 text-sm text-muted">Enjoy the open road.</p>
    </div>
  );
}

function DayList({
  eventsByDay,
  weekStart,
}: {
  eventsByDay: Map<string, CalEvent[]>;
  weekStart: Date;
}) {
  // build all 7 days in order so we can skip empty ones in a consistent way
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  return (
    <div className="flex flex-col gap-10">
      {days.map((day) => {
        const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
        if (dayEvents.length === 0) return null;
        return (
          <section key={day.toISOString()}>
            <div className="mb-3 flex items-center justify-between border-b border-rule pb-2">
              <h3 className="font-display text-lg italic text-ink">
                {dayHeaderFmt.format(day)}
              </h3>
              <span className="font-mono text-[11px] tracking-wider uppercase text-muted">
                {dayEvents.length}{" "}
                {dayEvents.length === 1 ? "event" : "events"}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {dayEvents.map((ev) => (
                <EventRow key={ev.id} event={ev} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function EventRow({ event }: { event: CalEvent }) {
  const start = getEventStart(event);
  const end = getEventEnd(event);
  const allDay = isAllDay(event);

  return (
    <li className="flex items-stretch overflow-hidden rounded-xl border border-rule bg-surface transition-colors duration-200 hover:bg-cream-deep">
      <div className="w-1.5 bg-accent" />
      <div className="flex flex-1 items-center gap-4 px-4 py-3.5">
        <div className="w-28 shrink-0 font-mono text-xs text-muted">
          {allDay ? (
            "ALL DAY"
          ) : (
            <>
              {timeFmt.format(start)}
              {end && (
                <span className="text-muted/70">
                  {" – "}
                  {timeFmt.format(end)}
                </span>
              )}
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium text-ink">
            {event.summary || "(no title)"}
          </div>
          {event.location && (
            <div className="truncate font-mono text-[11px] text-muted">
              {event.location}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
