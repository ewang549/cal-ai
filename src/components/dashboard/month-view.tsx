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
  type EventTone,
} from "@/lib/event-colors";
import {
  CalEvent,
  addDays,
  getEventEnd,
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

type PopoverState = {
  event: CalEvent;
  anchor: PopoverAnchor;
};

export function MonthView({
  events,
  anchor,
}: {
  events: CalEvent[];
  anchor: Date;
}) {
  const router = useRouter();
  const { categories, isVisible } = useCategories();
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tz =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  const today = new Date();
  const firstOfMonth = startOfMonth(anchor);
  const gridStart = startOfMonthGrid(anchor);

  const days: Date[] = Array.from({ length: 42 }, (_, i) =>
    addDays(gridStart, i),
  );
  const weekdayHeaders = Array.from({ length: 7 }, (_, i) =>
    addDays(gridStart, i),
  );

  // Apply the current category filter — events whose category is hidden
  // are dropped before grouping by day.
  const visibleEvents = events.filter((ev) =>
    isVisible(getEventCategoryId(ev) ?? null),
  );
  const eventsByDay = groupByDay(visibleEvents);

  async function handleReschedule(eventId: string, targetDay: Date) {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    if (isAllDay(event)) return; // skip all-day for v1
    const originalStart = getEventStart(event);
    const originalEnd = getEventEnd(event) ?? originalStart;
    if (isSameDay(originalStart, targetDay)) return;

    const durationMs = originalEnd.getTime() - originalStart.getTime();
    const newStart = new Date(targetDay);
    newStart.setHours(
      originalStart.getHours(),
      originalStart.getMinutes(),
      0,
      0,
    );
    const newEnd = new Date(newStart.getTime() + durationMs);

    setBusy(true);
    try {
      const res = await fetch("/api/events/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          updates: {
            start: toLocalIso(newStart),
            end: toLocalIso(newEnd),
          },
          timezone: tz,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Update failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      console.error("Reschedule failed:", err);
    } finally {
      setBusy(false);
      setDraggingId(null);
      setDragOverKey(null);
    }
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
      console.error("Delete failed:", err);
    } finally {
      setBusy(false);
    }
  }

  function openPopover(e: React.MouseEvent, event: CalEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPopover({ event, anchor: popoverAnchorFromClick(e) });
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_30px_80px_-40px_rgba(26,22,18,0.18)]">
        {/* weekday headers */}
        <div className="grid grid-cols-7 border-b border-rule bg-cream-deep/30">
          {weekdayHeaders.map((d, i) => (
            <div
              key={d.toISOString()}
              className={`px-3 py-3 font-mono text-[10px] tracking-[0.22em] uppercase ${
                i === 0 || i === 6 ? "text-muted/80" : "text-muted"
              }`}
            >
              {dayHeaderFmt.format(d)}
            </div>
          ))}
        </div>

        {/* day grid */}
        <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-rule/40">
          {days.map((day) => {
            const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
            const inMonth = day.getMonth() === firstOfMonth.getMonth();
            const isToday = isSameDay(day, today);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const key = day.toDateString();
            const isDragOver = dragOverKey === key;

            return (
              <DayCell
                key={day.toISOString()}
                day={day}
                events={dayEvents}
                inMonth={inMonth}
                isToday={isToday}
                isWeekend={isWeekend}
                isDragOver={isDragOver}
                draggingId={draggingId}
                onChipClick={openPopover}
                onChipDragStart={(id) => setDraggingId(id)}
                onChipDragEnd={() => {
                  setDraggingId(null);
                  setDragOverKey(null);
                }}
                onDragEnter={() => setDragOverKey(key)}
                onDragLeave={() => {
                  if (dragOverKey === key) setDragOverKey(null);
                }}
                onDrop={(id) => handleReschedule(id, day)}
              />
            );
          })}
        </div>
      </section>

      <p className="mt-3 text-center font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
        Click to view · Drag to reschedule
      </p>

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

/* ─── day cell ─── */

function DayCell({
  day,
  events,
  inMonth,
  isToday,
  isWeekend,
  isDragOver,
  draggingId,
  onChipClick,
  onChipDragStart,
  onChipDragEnd,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  day: Date;
  events: CalEvent[];
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isDragOver: boolean;
  draggingId: string | null;
  onChipClick: (e: React.MouseEvent, ev: CalEvent) => void;
  onChipDragStart: (id: string) => void;
  onChipDragEnd: () => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (id: string) => void;
}) {
  const baseBg = inMonth
    ? isWeekend
      ? "bg-cream-deep/30"
      : "bg-surface"
    : "bg-cream/40";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDrop(id);
      }}
      className={[
        "relative flex min-h-[130px] flex-col gap-1.5 p-2 transition-colors duration-200",
        baseBg,
        isDragOver
          ? "bg-accent/[0.07] ring-2 ring-inset ring-accent/50"
          : inMonth
            ? "hover:bg-cream-deep/40"
            : "",
      ].join(" ")}
    >
      {/* Today: subtle accent corner glow */}
      {isToday && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-none bg-gradient-to-br from-accent/[0.07] via-transparent to-transparent"
        />
      )}

      <div className="relative flex items-center justify-between">
        <span
          className={
            isToday
              ? "inline-flex size-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-medium text-cream shadow-[0_4px_12px_-4px_rgba(200,75,26,0.5)]"
              : inMonth
                ? "font-mono text-xs font-medium text-ink"
                : "font-mono text-xs text-muted/50"
          }
        >
          {day.getDate()}
        </span>
        {events.length > 0 && inMonth && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {events.length}
          </span>
        )}
      </div>

      <div className="relative flex flex-col gap-1">
        {events.slice(0, MAX_EVENTS_PER_CELL).map((ev) => (
          <EventChip
            key={ev.id}
            event={ev}
            isDragging={draggingId === ev.id}
            onClick={(e) => onChipClick(e, ev)}
            onDragStart={() => onChipDragStart(ev.id)}
            onDragEnd={onChipDragEnd}
          />
        ))}
        {events.length > MAX_EVENTS_PER_CELL && (
          <div className="pl-1 font-mono text-[10px] tracking-wider text-muted">
            +{events.length - MAX_EVENTS_PER_CELL} more
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── event chip ─── */

function EventChip({
  event,
  isDragging,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  event: CalEvent;
  isDragging: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const start = getEventStart(event);
  const allDay = isAllDay(event);
  const { categories } = useCategories();
  const tone: EventTone = toneForEvent(event, categories);

  return (
    <button
      type="button"
      draggable={!allDay}
      onClick={onClick}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", event.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={[
        "group/chip flex w-full items-center gap-1.5 overflow-hidden rounded-md border bg-cream/95 px-1.5 py-1 text-left text-[11px] transition-all duration-150",
        tone.border,
        tone.hoverBg,
        allDay ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        isDragging
          ? "scale-[0.98] opacity-40"
          : "hover:-translate-y-px hover:shadow-[0_4px_12px_-6px_rgba(26,22,18,0.3)]",
      ].join(" ")}
      aria-label={`${event.summary ?? "Event"} — click for details`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${tone.bar}`} />
      {!allDay && (
        <span className="shrink-0 font-mono text-[10px] text-muted group-hover/chip:text-ink-soft">
          {timeFmt.format(start)}
        </span>
      )}
      <span className="truncate font-medium text-ink">
        {event.summary || "(no title)"}
      </span>
    </button>
  );
}

/* ─── helpers ─── */

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

function toLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}:00`;
}
