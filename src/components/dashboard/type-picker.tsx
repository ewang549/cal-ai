"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Check,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Pencil,
  Tag,
  Users,
} from "lucide-react";

import { EVENT_TYPES, type EventType } from "@/lib/event-types";

const TYPE_ICONS: Record<EventType, React.ComponentType<{ className?: string }>> =
  {
    event: Calendar,
    class: GraduationCap,
    assignment: ClipboardCheck,
    exam: FileText,
    quiz: FileText,
    project: Pencil,
    study: BookOpen,
    meeting: Users,
    other: Tag,
  };

/**
 * Picker for the event's "type" (assignment, exam, etc.).
 * Same portal-based dropdown pattern as <CategoryPicker> so it escapes
 * the popover's overflow-hidden clipping.
 */
export function TypePicker({
  eventId,
  currentType,
}: {
  eventId: string;
  currentType: EventType | null;
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<EventType | null>(currentType);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function openMenu() {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 208;
    let x = rect.right - menuWidth + window.scrollX;
    let y = rect.bottom + 4 + window.scrollY;
    if (x < window.scrollX + 8) x = window.scrollX + 8;
    if (rect.bottom + 360 > window.innerHeight) {
      y = rect.top - 360 - 4 + window.scrollY;
    }
    setPos({ x, y });
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    setPos(null);
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      closeMenu();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
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
  }, [open]);

  async function pick(type: EventType | null) {
    setBusy(true);
    setSelected(type);
    try {
      const res = await fetch("/api/events/type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, type }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (err) {
      setSelected(currentType);
      // eslint-disable-next-line no-console
      console.error("Set type failed:", err);
    } finally {
      setBusy(false);
      closeMenu();
    }
  }

  const CurrentIcon = selected ? TYPE_ICONS[selected] : Tag;
  const currentLabel = selected
    ? EVENT_TYPES.find((t) => t.id === selected)?.label
    : "No type";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? closeMenu() : openMenu())}
        disabled={busy}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-colors duration-150 hover:bg-cream-deep hover:text-ink disabled:opacity-60"
      >
        <CurrentIcon className="size-3 text-muted" aria-hidden />
        {busy ? "Saving…" : currentLabel}
      </button>

      {open &&
        pos &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: "absolute",
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: "208px",
            }}
            className="z-[80] max-h-[60vh] overflow-y-auto rounded-xl border border-rule bg-surface shadow-[0_20px_50px_-15px_rgba(26,22,18,0.4)]"
          >
            <button
              type="button"
              role="option"
              aria-selected={selected === null}
              onClick={() => pick(null)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] text-ink-soft transition-colors duration-100 hover:bg-cream-deep/40"
            >
              <span className="flex items-center gap-2">
                <Tag className="size-3.5 text-muted" aria-hidden />
                No type
              </span>
              {selected === null && (
                <Check className="size-3.5 text-accent" strokeWidth={2.5} />
              )}
            </button>
            {EVENT_TYPES.map((t) => {
              const Icon = TYPE_ICONS[t.id];
              const isActive = selected === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => pick(t.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] text-ink transition-colors duration-100 hover:bg-cream-deep/40"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-3.5 text-ink-soft" aria-hidden />
                    {t.label}
                  </span>
                  {isActive && (
                    <Check className="size-3.5 text-accent" strokeWidth={2.5} />
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
