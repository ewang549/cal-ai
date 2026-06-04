"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, Check } from "lucide-react";

import { useCategories } from "@/components/dashboard/category-context";
import { toneByName } from "@/lib/event-colors";

/**
 * Picker for assigning a category to an event.
 *
 * The dropdown is portaled into <body> so it escapes the parent popover's
 * `overflow-hidden` (which would otherwise clip it). Coordinates are
 * computed in document space (rect + scroll) so it stays anchored to the
 * trigger when the user scrolls.
 */
export function CategoryPicker({
  eventId,
  currentCategoryId,
  onChange,
}: {
  eventId: string;
  currentCategoryId: string | null;
  onChange?: (newCategoryId: string | null) => void;
}) {
  const { categories } = useCategories();
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(currentCategoryId);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  function openMenu() {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 208;
    // Anchor the menu's right edge to the button's right edge.
    let x = rect.right - menuWidth + window.scrollX;
    let y = rect.bottom + 4 + window.scrollY;
    // Keep inside viewport horizontally.
    if (x < window.scrollX + 8) x = window.scrollX + 8;
    // Flip above the trigger if not enough room below.
    if (rect.bottom + 240 > window.innerHeight) {
      y = rect.top - 240 - 4 + window.scrollY;
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

  async function pick(categoryId: string | null) {
    setBusy(true);
    setError(null);
    setSelected(categoryId);
    try {
      const res = await fetch("/api/events/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, categoryId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      onChange?.(categoryId);
      // Slight delay before refresh — gives Google a beat to propagate the
      // extendedProperties change so the next fetch sees the new value.
      setTimeout(() => router.refresh(), 250);
      closeMenu();
    } catch (err) {
      setSelected(currentCategoryId);
      setError(err instanceof Error ? err.message : "Couldn't save");
      // eslint-disable-next-line no-console
      console.error("Set category failed:", err);
      // Keep the menu open so the user sees the error message.
    } finally {
      setBusy(false);
    }
  }

  const current = selected
    ? categories.find((c) => c.id === selected)
    : undefined;

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
        <span
          aria-hidden
          className={`size-2 rounded-full ${
            current ? (toneByName(current.tone)?.bar ?? "bg-muted") : "bg-muted"
          }`}
        />
        {busy ? "Saving…" : current ? current.name : "No category"}
      </button>

      {open &&
        pos &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            data-picker-portal
            style={{
              position: "absolute",
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: "208px",
            }}
            className="z-[80] max-h-[60vh] overflow-y-auto rounded-xl border border-rule bg-surface shadow-[0_20px_50px_-15px_rgba(26,22,18,0.4)]"
          >
            {error && (
              <div className="flex items-start gap-2 border-b border-rule bg-accent/10 px-3 py-2 text-[12px] text-accent">
                <AlertCircle
                  className="mt-0.5 size-3.5 shrink-0"
                  strokeWidth={2}
                />
                <span className="flex-1 leading-tight">{error}</span>
              </div>
            )}
            <button
              type="button"
              role="option"
              aria-selected={selected === null}
              onClick={() => pick(null)}
              disabled={busy}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] text-ink-soft transition-colors duration-100 hover:bg-cream-deep/40 disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2 rounded-full bg-muted"
                />
                No category
              </span>
              {selected === null && (
                <Check className="size-3.5 text-accent" strokeWidth={2.5} />
              )}
            </button>
            {categories.map((cat) => {
              const tone = toneByName(cat.tone);
              const isActive = selected === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => pick(cat.id)}
                  disabled={busy}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] text-ink transition-colors duration-100 hover:bg-cream-deep/40 disabled:opacity-60"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`size-2 rounded-full ${tone?.bar ?? "bg-muted"}`}
                    />
                    {cat.name}
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
