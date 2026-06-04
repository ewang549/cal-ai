"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Trash2, X } from "lucide-react";

import { CategoryPicker } from "@/components/dashboard/category-picker";
import { TypePicker } from "@/components/dashboard/type-picker";
import { Button } from "@/components/ui/button";
import { getEventCategoryId, toneForEvent } from "@/lib/event-colors";
import { useCategories } from "@/components/dashboard/category-context";
import { getEventType } from "@/lib/event-types";
import {
  CalEvent,
  getEventEnd,
  getEventStart,
  isAllDay,
} from "@/lib/google-calendar";

/**
 * Shared event-detail popover for both month and week views.
 *
 * Lives in a portal under <body> with `position: absolute` and coordinates
 * computed from `getBoundingClientRect() + window.scrollX/Y` so it scrolls
 * with the page (instead of staying glued to the viewport, which was the
 * bug previously when using position: fixed).
 */

const dayLabelFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT_ESTIMATE = 320;

export type PopoverAnchor = {
  /** Document-coordinate left (already includes scrollX). */
  x: number;
  /** Document-coordinate top (already includes scrollY). */
  y: number;
};

/**
 * Compute popover position from a click event's bounding rect.
 * Adjusts for viewport edges. Adds the page scroll offset so the
 * coordinates are document-space, not viewport-space.
 */
export function popoverAnchorFromClick(
  e: React.MouseEvent,
): PopoverAnchor {
  const rect = e.currentTarget.getBoundingClientRect();
  const margin = 8;

  let viewportX = rect.left;
  let viewportY = rect.bottom + 6;

  if (typeof window !== "undefined") {
    if (viewportX + POPOVER_WIDTH + margin > window.innerWidth) {
      viewportX = Math.max(
        margin,
        window.innerWidth - POPOVER_WIDTH - margin,
      );
    }
    if (viewportY + POPOVER_HEIGHT_ESTIMATE + margin > window.innerHeight) {
      viewportY = Math.max(margin, rect.top - POPOVER_HEIGHT_ESTIMATE - 4);
    }
  }

  const scrollX = typeof window !== "undefined" ? window.scrollX : 0;
  const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
  return { x: viewportX + scrollX, y: viewportY + scrollY };
}

export function EventPopover({
  event,
  anchor,
  busy,
  onClose,
  onDelete,
}: {
  event: CalEvent;
  anchor: PopoverAnchor;
  busy: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { categories } = useCategories();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click + Escape. Defer initial registration so the
  // very click that opened the popover doesn't immediately close it.
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

  if (!mounted) return null;

  const start = getEventStart(event);
  const end = getEventEnd(event);
  const allDay = isAllDay(event);
  const tone = toneForEvent(event, categories);
  const currentType = getEventType(event);
  const currentCategoryId = getEventCategoryId(event);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={event.summary || "Event details"}
      style={{ left: `${anchor.x}px`, top: `${anchor.y}px`, width: POPOVER_WIDTH }}
      className="absolute z-[60] overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_30px_80px_-20px_rgba(26,22,18,0.45)]"
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

          {/* Type + Category pickers */}
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
              Type
            </span>
            <TypePicker eventId={event.id} currentType={currentType} />
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
              Category
            </span>
            <CategoryPicker
              eventId={event.id}
              currentCategoryId={currentCategoryId}
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
    </div>,
    document.body,
  );
}
