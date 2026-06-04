"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useCategories } from "@/components/dashboard/category-context";
import {
  EventPopover,
  popoverAnchorFromClick,
  type PopoverAnchor,
} from "@/components/dashboard/event-popover";
import {
  getEventCategoryId,
  toneForEvent,
} from "@/lib/event-colors";
import { getEventType } from "@/lib/event-types";
import {
  CalEvent,
  addDays,
  getEventEnd,
  getEventStart,
  isAllDay,
  isSameDay,
  startOfWeek,
} from "@/lib/google-calendar";

const dayHeaderFmt = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const dayDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

type PopoverState = {
  event: CalEvent;
  anchor: PopoverAnchor;
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

/**
 * Should an event be shown in the list view? We hide events that already
 * happened (cleaner schedule view), but keep showing past-due ASSIGNMENTS
 * so students don't forget about them.
 */
function shouldShowInList(event: CalEvent, startOfToday: Date): boolean {
  const eventStart = getEventStart(event);
  if (eventStart >= startOfToday) return true; // future / today: always show
  // Past event: only show if it's an assignment / project that's still open.
  const t = getEventType(event);
  return t === "assignment" || t === "project";
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
  const router = useRouter();
  const { isVisible } = useCategories();
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return null; // dashboard page renders ErrorCard

  // Calculate start of today once (in local time).
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const visibleEvents = events.filter((ev) => {
    if (!isVisible(getEventCategoryId(ev) ?? null)) return false;
    return shouldShowInList(ev, startOfToday);
  });

  function openPopover(e: React.MouseEvent, event: CalEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPopover({ event, anchor: popoverAnchorFromClick(e) });
  }

  async function handleDelete(eventId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/events/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Delete failed (${res.status})`);
      }
      setPopover(null);
      router.refresh();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Delete failed:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DayList
        eventsByDay={groupByDay(visibleEvents)}
        weekStart={startOfWeek(anchor)}
        startOfToday={startOfToday}
        onEventClick={openPopover}
      />

      {popover && (
        <EventPopover
          event={popover.event}
          anchor={popover.anchor}
          busy={busy}
          onClose={() => setPopover(null)}
          onDelete={() => handleDelete(popover.event.id)}
        />
      )}
    </>
  );
}

function DayList({
  eventsByDay,
  weekStart,
  startOfToday,
  onEventClick,
}: {
  eventsByDay: Map<string, CalEvent[]>;
  weekStart: Date;
  startOfToday: Date;
  onEventClick: (e: React.MouseEvent, ev: CalEvent) => void;
}) {
  const today = new Date();
  const days: Date[] = Array.from({ length: 7 }, (_, i) =>
    addDays(weekStart, i),
  );

  return (
    <div className="flex flex-col gap-8">
      {days.map((day) => {
        const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
        const isToday = isSameDay(day, today);
        const isPast = day < startOfToday && !isToday;
        const isEmpty = dayEvents.length === 0;

        // Skip rendering past days that have nothing overdue.
        if (isPast && isEmpty) return null;

        return (
          <section key={day.toISOString()}>
            <DayHeader
              day={day}
              isToday={isToday}
              isPast={isPast}
              count={dayEvents.length}
            />
            {isEmpty ? (
              <div className="mt-3 rounded-xl border border-dashed border-rule/60 bg-cream/40 px-4 py-4 text-center font-mono text-[11px] tracking-wider uppercase text-muted/70">
                No events
              </div>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {dayEvents.map((ev) => (
                  <EventRow
                    key={ev.id}
                    event={ev}
                    isPast={isPast}
                    onClick={(e) => onEventClick(e, ev)}
                  />
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
  isPast,
  count,
}: {
  day: Date;
  isToday: boolean;
  isPast: boolean;
  count: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2.5">
      <div className="flex items-baseline gap-3">
        <h3
          className={`font-display text-2xl italic tracking-tight ${
            isToday ? "text-accent" : isPast ? "text-muted" : "text-ink"
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
        {isPast && (
          <span className="rounded-full border border-rule px-2 py-0.5 font-mono text-[9px] tracking-[0.18em] uppercase text-muted">
            Overdue
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

function EventRow({
  event,
  isPast,
  onClick,
}: {
  event: CalEvent;
  isPast: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const { categories } = useCategories();
  const start = getEventStart(event);
  const end = getEventEnd(event);
  const allDay = isAllDay(event);
  const tone = toneForEvent(event, categories);
  const type = getEventType(event);

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-stretch overflow-hidden rounded-xl border border-rule bg-surface text-left transition-all duration-200 hover:-translate-y-px hover:border-rule hover:bg-cream-deep/40 hover:shadow-[0_10px_30px_-15px_rgba(26,22,18,0.2)]"
        aria-label={`${event.summary ?? "Event"} — click for details`}
      >
        <div className={`w-1.5 ${tone.bar}`} />
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
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-medium text-ink">
                {event.summary || "(no title)"}
              </span>
              {isPast && (
                <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.18em] uppercase text-accent">
                  Overdue
                </span>
              )}
              {type && type !== "event" && !isPast && (
                <span className="shrink-0 rounded-full border border-rule px-1.5 py-0.5 font-mono text-[9px] tracking-[0.18em] uppercase text-muted">
                  {type}
                </span>
              )}
            </div>
            {event.location && (
              <div className="mt-0.5 truncate font-mono text-[11px] text-muted">
                {event.location}
              </div>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}
