"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { useCategories } from "@/components/dashboard/category-context";
import { toneForEvent } from "@/lib/event-colors";
import {
  CalEvent,
  getEventStart,
  isAllDay,
  toAnchorString,
} from "@/lib/google-calendar";

/**
 * Cmd+K / Ctrl+K search palette. Modal overlay that filters across a pool
 * of upcoming events the dashboard page passed down. Click or Enter on a
 * result navigates to that day in month view.
 *
 * Mounted once at the dashboard level — listens for the keyboard shortcut
 * globally and toggles itself.
 */

const dayFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const MAX_RESULTS = 30;

export function SearchPalette({ pool }: { pool: CalEvent[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd+K / Ctrl+K to toggle.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (k === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (k === "escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Focus input when opening.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // No query → show next ~30 upcoming events.
      const now = Date.now();
      return pool
        .filter((ev) => getEventStart(ev).getTime() >= now)
        .slice(0, MAX_RESULTS);
    }
    return pool
      .filter((ev) => {
        const hay = [
          ev.summary,
          ev.location,
          ev.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, MAX_RESULTS);
  }, [pool, query]);

  function jumpTo(ev: CalEvent) {
    const start = getEventStart(ev);
    const anchor = toAnchorString(start);
    router.push(`/dashboard?view=month&anchor=${anchor}`);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const ev = results[activeIndex];
      if (ev) jumpTo(ev);
    }
  }

  return (
    <>
      {/* The trigger button (rendered separately by parent for placement
          flexibility) is just a function call; expose via context if needed.
          For now the keyboard shortcut + the dashboard header button cover it. */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search events"
          className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/40 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_40px_100px_-30px_rgba(26,22,18,0.5)]">
            <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
              <Search className="size-4 text-muted" aria-hidden />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search events, locations, notes…"
                aria-label="Search query"
                className="h-7 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder-muted outline-none"
              />
              <kbd className="hidden font-mono text-[10px] tracking-wider uppercase text-muted sm:inline">
                Esc
              </kbd>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="flex size-7 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-cream-deep hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {results.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted">
                {query
                  ? `No events match “${query}”.`
                  : "Nothing scheduled in the next two months."}
              </div>
            ) : (
              <ul
                role="listbox"
                className="max-h-[50vh] overflow-y-auto py-1"
              >
                {results.map((ev, i) => (
                  <ResultRow
                    key={ev.id}
                    event={ev}
                    active={i === activeIndex}
                    onClick={() => jumpTo(ev)}
                    onMouseEnter={() => setActiveIndex(i)}
                  />
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between border-t border-rule bg-cream-deep/30 px-4 py-2 font-mono text-[10px] tracking-wider uppercase text-muted">
              <span>
                <kbd className="rounded border border-rule bg-surface px-1 py-0.5">↑↓</kbd>{" "}
                navigate ·{" "}
                <kbd className="rounded border border-rule bg-surface px-1 py-0.5">↵</kbd>{" "}
                open
              </span>
              <span>{results.length} results</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResultRow({
  event,
  active,
  onClick,
  onMouseEnter,
}: {
  event: CalEvent;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const { categories } = useCategories();
  const start = getEventStart(event);
  const allDay = isAllDay(event);
  const tone = toneForEvent(event, categories);

  return (
    <li role="option" aria-selected={active}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className={[
          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100",
          active ? "bg-cream-deep/50" : "hover:bg-cream-deep/30",
        ].join(" ")}
      >
        <span className={`size-2 shrink-0 rounded-full ${tone.bar}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-ink">
            {event.summary || "(no title)"}
          </div>
          {event.location && (
            <div className="truncate font-mono text-[10px] tracking-wider text-muted">
              {event.location}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right font-mono text-[11px] text-muted">
          <div>{dayFmt.format(start)}</div>
          {!allDay && <div className="text-muted/70">{timeFmt.format(start)}</div>}
        </div>
      </button>
    </li>
  );
}

/**
 * Visible button that opens the same palette. Reads the same global state
 * via a custom event so we don't need a provider — small enough that this
 * trade-off is OK.
 */
export function SearchTrigger() {
  return (
    <button
      type="button"
      aria-label="Search events (Cmd+K)"
      onClick={() => {
        // Dispatch a fake Cmd+K so the palette mounts and opens.
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          }),
        );
      }}
      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-rule bg-surface px-3.5 text-sm font-medium text-ink-soft transition-colors duration-200 hover:bg-cream-deep hover:text-ink"
    >
      <Search className="size-3.5" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden font-mono text-[10px] tracking-wider uppercase text-muted sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}
