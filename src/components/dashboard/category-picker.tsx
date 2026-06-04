"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { useCategories } from "@/components/dashboard/category-context";
import { toneByName } from "@/lib/event-colors";

/**
 * Inline picker for assigning a category to an event. Used inside the
 * month-view event popover and the week-view detail popover.
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
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(currentCategoryId);

  const current = selected
    ? categories.find((c) => c.id === selected)
    : undefined;

  async function pick(categoryId: string | null) {
    setBusy(true);
    setSelected(categoryId);
    try {
      const res = await fetch("/api/events/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, categoryId }),
      });
      if (!res.ok) throw new Error(await res.text());
      onChange?.(categoryId);
      router.refresh();
    } catch (err) {
      // revert on failure
      setSelected(currentCategoryId);
      // eslint-disable-next-line no-console
      console.error("Set category failed:", err);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-colors duration-150 hover:bg-cream-deep hover:text-ink disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          aria-hidden
          className={`size-2 rounded-full ${
            current ? (toneByName(current.tone)?.bar ?? "bg-muted") : "bg-muted"
          }`}
        />
        {busy ? "Saving…" : current ? current.name : "No category"}
      </button>

      {open && !busy && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_20px_50px_-15px_rgba(26,22,18,0.4)]"
        >
          <button
            type="button"
            role="option"
            aria-selected={selected === null}
            onClick={() => pick(null)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] text-ink-soft transition-colors duration-100 hover:bg-cream-deep/40"
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
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] text-ink transition-colors duration-100 hover:bg-cream-deep/40"
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
        </div>
      )}

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="fixed inset-0 z-40 cursor-default"
          tabIndex={-1}
        >
          <X className="hidden" />
        </button>
      )}
    </div>
  );
}
