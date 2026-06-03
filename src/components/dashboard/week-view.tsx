import {
  CalEvent,
  addDays,
  getEventEnd,
  getEventStart,
  isAllDay,
  isSameDay,
  startOfWeek,
} from "@/lib/google-calendar";

const dayHeaderFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
});
const dayDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const CHIP_TONES = ["accent", "ink", "amber", "emerald"] as const;
type ChipTone = (typeof CHIP_TONES)[number];

function chipToneFor(id: string): ChipTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CHIP_TONES[h % CHIP_TONES.length];
}

const TONE_BAR: Record<ChipTone, string> = {
  accent: "bg-accent",
  ink: "bg-ink",
  amber: "bg-amber-600",
  emerald: "bg-emerald-600",
};

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

export function WeekListView({
  events,
  error,
  anchor,
}: {
  events: CalEvent[];
  error: string | null;
  anchor: Date;
}) {
  if (error) return null; // dashboard page renders ErrorCard
  return (
    <DayList eventsByDay={groupByDay(events)} weekStart={startOfWeek(anchor)} />
  );
}

function DayList({
  eventsByDay,
  weekStart,
}: {
  eventsByDay: Map<string, CalEvent[]>;
  weekStart: Date;
}) {
  const today = new Date();
  const days: Date[] = Array.from({ length: 7 }, (_, i) =>
    addDays(weekStart, i),
  );
  const totalEvents = Array.from(eventsByDay.values()).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );

  if (totalEvents === 0) {
    return (
      <div className="rounded-2xl border border-rule bg-surface px-6 py-20 text-center shadow-[0_30px_80px_-40px_rgba(26,22,18,0.18)]">
        <h2 className="font-display text-3xl italic text-ink-soft">
          Nothing scheduled.
        </h2>
        <p className="mt-3 text-sm text-muted">
          Type below to add an event, or ask Cal AI for suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {days.map((day) => {
        const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
        const isToday = isSameDay(day, today);
        const isEmpty = dayEvents.length === 0;

        return (
          <section key={day.toISOString()}>
            <DayHeader day={day} isToday={isToday} count={dayEvents.length} />
            {isEmpty ? (
              <div className="mt-3 rounded-xl border border-dashed border-rule/60 bg-cream/40 px-4 py-4 text-center font-mono text-[11px] tracking-wider uppercase text-muted/70">
                No events
              </div>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {dayEvents.map((ev) => (
                  <EventRow key={ev.id} event={ev} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function DayHeader({
  day,
  isToday,
  count,
}: {
  day: Date;
  isToday: boolean;
  count: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2.5">
      <div className="flex items-baseline gap-3">
        <h3
          className={`font-display text-2xl italic tracking-tight ${
            isToday ? "text-accent" : "text-ink"
          }`}
        >
          {dayHeaderFmt.format(day)}
        </h3>
        <span className="font-mono text-[11px] tracking-wider uppercase text-muted">
          {dayDateFmt.format(day)}
        </span>
        {isToday && (
          <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[9px] tracking-[0.18em] uppercase text-cream">
            Today
          </span>
        )}
      </div>
      {count > 0 && (
        <span className="font-mono text-[11px] tracking-wider uppercase text-muted">
          {count} {count === 1 ? "event" : "events"}
        </span>
      )}
    </div>
  );
}

function EventRow({ event }: { event: CalEvent }) {
  const start = getEventStart(event);
  const end = getEventEnd(event);
  const allDay = isAllDay(event);
  const tone = TONE_BAR[chipToneFor(event.id)];

  const content = (
    <div className="group flex items-stretch overflow-hidden rounded-xl border border-rule bg-surface transition-all duration-200 hover:-translate-y-px hover:border-rule hover:bg-cream-deep/40 hover:shadow-[0_10px_30px_-15px_rgba(26,22,18,0.2)]">
      <div className={`w-1.5 ${tone}`} />
      <div className="flex flex-1 items-center gap-4 px-4 py-3.5">
        <div className="w-28 shrink-0 font-mono text-xs text-muted">
          {allDay ? (
            "ALL DAY"
          ) : (
            <>
              <span className="text-ink-soft">{timeFmt.format(start)}</span>
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
            <div className="mt-0.5 truncate font-mono text-[11px] text-muted">
              {event.location}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (event.htmlLink) {
    return (
      <li>
        <a
          href={event.htmlLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {content}
        </a>
      </li>
    );
  }
  return <li>{content}</li>;
}
