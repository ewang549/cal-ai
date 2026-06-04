"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2, X } from "lucide-react";

import { useCategories } from "@/components/dashboard/category-context";
import { CategoryPicker } from "@/components/dashboard/category-picker";
import { Button } from "@/components/ui/button";
import {
  getEventCategoryId,
  toneForEvent,
  type EventTone,
} from "@/lib/event-colors";
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

type PopoverState = {
  event: CalEvent;
  x: number;
  y: number;
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
  const router = useRouter();
  const { isVisible } = useCategories();
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return null; // dashboard page renders ErrorCard

  const visibleEvents = events.filter((ev) =>
    isVisible(getEventCategoryId(ev) ?? null),
  );

  function openPopover(e: React.MouseEvent, event: CalEvent) {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 320;
    const popoverHeight = 240;
    const margin = 8;
    let x = rect.left;
    let y = rect.bottom + 6;
    if (typeof window !== "undefined") {
      if (x + popoverWidth + margin > window.innerWidth) {
        x = Math.max(margin, window.innerWidth - popoverWidth - margin);
      }
      if (y + popoverHeight + margin > window.innerHeight) {
        y = Math.max(margin, rect.top - popoverHeight - 4);
      }
    }
    setPopover({ event, x, y });
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
        onEventClick={openPopover}
      />

      {popover && (
        <EventPopover
          event={popover.event}
          x={popover.x}
          y={popover.y}
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
  onEventClick,
}: {
  eventsByDay: Map<string, CalEvent[]>;
  weekStart: Date;
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
                  <EventRow
                    key={ev.id}
                    event={ev}
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

function EventRow({
  event,
  onClick,
}: {
  event: CalEvent;
  onClick: (e: React.MouseEvent) => void;
}) {
  const { categories } = useCategories();
  const start = getEventStart(event);
  const end = getEventEnd(event);
  const allDay = isAllDay(event);
  const tone = toneForEvent(event, categories);

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
      </button>
    </li>
  );
}

/* ─── event detail popover (same look as month-view's) ─── */

const dayLabelFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function EventPopover({
  event,
  x,
  y,
  busy,
  onClose,
  onDelete,
}: {
  event: CalEvent;
  x: number;
  y: number;
  busy: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { categories } = useCategories();
  const ref = useRef<HTMLDivElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const id = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const start = getEventStart(event);
  const end = getEventEnd(event);
  const allDay = isAllDay(event);
  const tone: EventTone = toneForEvent(event, categories);

  return (
    <div
      ref={ref}
      style={{ left: `${x}px`, top: `${y}px` }}
      className="fixed z-50 w-80 overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_30px_80px_-20px_rgba(26,22,18,0.45)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
          {dayLabelFmt.format(start)}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-6 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-cream-deep hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="flex items-stretch">
        <div className={`w-1.5 ${tone.bar}`} />
        <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
          <div className="font-display text-xl tracking-tight text-ink">
            {event.summary || "(no title)"}
          </div>
          <div className="font-mono text-xs text-ink-soft">
            {allDay
              ? "All day"
              : `${timeFmt.format(start)} – ${end ? timeFmt.format(end) : "?"}`}
          </div>
          {event.location && (
            <div className="text-sm text-ink-soft">📍 {event.location}</div>
          )}
          {event.description && (
            <div className="line-clamp-3 text-sm leading-relaxed text-ink-soft">
              {event.description}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
              Category
            </span>
            <CategoryPicker
              eventId={event.id}
              currentCategoryId={getEventCategoryId(event)}
            />
          </div>
        </div>
      </div>

      {!confirmingDelete ? (
        <div className="flex items-center gap-2 border-t border-rule bg-cream-deep/30 px-3 py-2.5">
          {event.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors duration-200 hover:bg-cream"
            >
              <ExternalLink className="size-3.5" />
              Open in Google
            </a>
          )}
          <div className="ml-auto">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
            >
              <Trash2 className="mr-1.5 size-3.5" strokeWidth={2.25} />
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t border-rule bg-cream-deep/30 px-3 py-2.5">
          <div className="text-xs text-ink-soft">Cancel this event?</div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirmingDelete(false)}
              disabled={busy}
            >
              Keep
            </Button>
            <Button type="button" size="sm" onClick={onDelete} disabled={busy}>
              {busy ? (
                "Cancelling…"
              ) : (
                <>
                  <Trash2 className="mr-1.5 size-3.5" strokeWidth={2.25} />
                  Yes
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
