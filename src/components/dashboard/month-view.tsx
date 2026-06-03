"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
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
const dayLabelFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const MAX_EVENTS_PER_CELL = 3;

/** Deterministic palette pick — same event always renders in the same tone. */
const CHIP_TONES = ["accent", "ink", "amber", "emerald"] as const;
type ChipTone = (typeof CHIP_TONES)[number];

function chipToneFor(id: string): ChipTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CHIP_TONES[h % CHIP_TONES.length];
}

const TONE_CLASSES: Record<
  ChipTone,
  { dot: string; border: string; hover: string }
> = {
  accent: {
    dot: "bg-accent",
    border: "border-accent/25",
    hover: "hover:border-accent/60 hover:bg-accent/[0.06]",
  },
  ink: {
    dot: "bg-ink",
    border: "border-ink/15",
    hover: "hover:border-ink/40 hover:bg-ink/[0.04]",
  },
  amber: {
    dot: "bg-amber-600",
    border: "border-amber-600/25",
    hover: "hover:border-amber-600/60 hover:bg-amber-600/[0.06]",
  },
  emerald: {
    dot: "bg-emerald-600",
    border: "border-emerald-600/25",
    hover: "hover:border-emerald-600/60 hover:bg-emerald-600/[0.06]",
  },
};

type PopoverState = {
  event: CalEvent;
  x: number;
  y: number;
};

export function MonthView({
  events,
  anchor,
}: {
  events: CalEvent[];
  anchor: Date;
}) {
  const router = useRouter();
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
  const eventsByDay = groupByDay(events);

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
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 320;
    const popoverHeight = 220;
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
  const tone = TONE_CLASSES[chipToneFor(event.id)];

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
        tone.hover,
        allDay ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        isDragging
          ? "scale-[0.98] opacity-40"
          : "hover:-translate-y-px hover:shadow-[0_4px_12px_-6px_rgba(26,22,18,0.3)]",
      ].join(" ")}
      aria-label={`${event.summary ?? "Event"} — click for details`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${tone.dot}`} />
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

/* ─── event popover ─── */

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
  const tone = TONE_CLASSES[chipToneFor(event.id)];

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
        <div className={`w-1.5 ${tone.dot}`} />
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
            <Button
              type="button"
              size="sm"
              onClick={onDelete}
              disabled={busy}
            >
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
