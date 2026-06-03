import {
  CalEvent,
  addDays,
  getEventStart,
  isAllDay,
  isSameDay,
  startOfMonth,
  startOfMonthGrid,
} from "@/lib/google-calendar";

const dayHeaderFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const MAX_EVENTS_PER_CELL = 3;

export function MonthView({
  events,
  anchor,
}: {
  events: CalEvent[];
  anchor: Date;
}) {
  const today = new Date();
  const firstOfMonth = startOfMonth(anchor);
  const gridStart = startOfMonthGrid(anchor);

  // 6 rows × 7 cols = 42 cells covers every possible month layout
  const days: Date[] = Array.from({ length: 42 }, (_, i) =>
    addDays(gridStart, i),
  );

  const eventsByDay = groupByDay(events);
  const weekdayHeaders = Array.from({ length: 7 }, (_, i) =>
    addDays(gridStart, i),
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-rule bg-surface">
      {/* weekday headers */}
      <div className="grid grid-cols-7 border-b border-rule bg-cream-deep/30">
        {weekdayHeaders.map((d) => (
          <div
            key={d.toISOString()}
            className="px-3 py-2.5 font-mono text-[10px] tracking-[0.22em] uppercase text-muted"
          >
            {dayHeaderFmt.format(d)}
          </div>
        ))}
      </div>

      {/* day grid */}
      <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-rule/60">
        {days.map((day) => {
          const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
          const inMonth = day.getMonth() === firstOfMonth.getMonth();
          const today_ = isSameDay(day, today);

          return (
            <div
              key={day.toISOString()}
              className={[
                "flex min-h-[120px] flex-col gap-1 p-2 transition-colors duration-200 hover:bg-cream-deep/30",
                inMonth ? "bg-surface" : "bg-cream/40",
              ].join(" ")}
            >
              {/* day number */}
              <div className="flex items-center justify-between">
                <span
                  className={
                    today_
                      ? "inline-flex size-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-medium text-cream"
                      : inMonth
                        ? "font-mono text-xs text-ink"
                        : "font-mono text-xs text-muted/60"
                  }
                >
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* events */}
              <div className="flex flex-col gap-1">
                {dayEvents.slice(0, MAX_EVENTS_PER_CELL).map((ev) => (
                  <EventChip key={ev.id} event={ev} />
                ))}
                {dayEvents.length > MAX_EVENTS_PER_CELL && (
                  <div className="font-mono text-[10px] tracking-wider uppercase text-muted">
                    +{dayEvents.length - MAX_EVENTS_PER_CELL} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EventChip({ event }: { event: CalEvent }) {
  const start = getEventStart(event);
  const allDay = isAllDay(event);
  const content = (
    <div className="flex items-center gap-1.5 overflow-hidden rounded-md border border-rule/70 bg-cream px-1.5 py-1 text-[11px] transition-colors duration-200 hover:bg-cream-deep">
      <span className="size-1.5 shrink-0 rounded-full bg-accent" />
      {!allDay && (
        <span className="shrink-0 font-mono text-[10px] text-muted">
          {timeFmt.format(start)}
        </span>
      )}
      <span className="truncate text-ink">
        {event.summary || "(no title)"}
      </span>
    </div>
  );

  return event.htmlLink ? (
    <a
      href={event.htmlLink}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      {content}
    </a>
  ) : (
    content
  );
}

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
