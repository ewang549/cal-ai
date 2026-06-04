"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eye, Settings2 } from "lucide-react";

import {
  UNCATEGORIZED_FILTER_ID,
  useCategories,
} from "@/components/dashboard/category-context";
import { CategoryManager } from "@/components/dashboard/category-manager";
import { toneByName } from "@/lib/event-colors";

/**
 * Filter dropdown shown in the dashboard header.
 * Lets the user toggle which categories are visible on the calendar,
 * and opens the "Manage categories" modal.
 */
export function CategoryFilter() {
  const {
    categories,
    hidden,
    toggleHidden,
    resetFilter,
  } = useCategories();
  const [open, setOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    const id = setTimeout(
      () => document.addEventListener("mousedown", handle),
      0,
    );
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handle);
    };
  }, [open]);

  const hiddenCount = hidden.size;

  return (
    <>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="true"
          aria-expanded={open}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rule bg-surface px-3 text-sm font-medium text-ink-soft transition-colors duration-200 hover:bg-cream-deep hover:text-ink"
        >
          <Eye className="size-3.5" />
          <span className="hidden sm:inline">
            {hiddenCount === 0 ? "All categories" : `${hiddenCount} hidden`}
          </span>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-1.5 w-64 overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_24px_60px_-20px_rgba(26,22,18,0.4)]"
          >
            <div className="flex items-center justify-between border-b border-rule px-3 py-2">
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
                Filter
              </div>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilter}
                  className="font-mono text-[10px] tracking-wider uppercase text-muted hover:text-ink"
                >
                  Show all
                </button>
              )}
            </div>

            <ul className="py-1">
              {categories.map((cat) => {
                const tone = toneByName(cat.tone);
                const visible = !hidden.has(cat.id);
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={visible}
                      onClick={() => toggleHidden(cat.id)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-100 hover:bg-cream-deep/40"
                    >
                      <span
                        aria-hidden
                        className={[
                          "flex size-4 items-center justify-center rounded-md border transition-colors duration-100",
                          visible
                            ? "border-accent bg-accent text-cream"
                            : "border-rule bg-surface",
                        ].join(" ")}
                      >
                        {visible && (
                          <Check className="size-3" strokeWidth={2.5} />
                        )}
                      </span>
                      <span
                        aria-hidden
                        className={`size-2 rounded-full ${tone?.bar ?? "bg-muted"}`}
                      />
                      <span className="flex-1 text-[14px] text-ink">
                        {cat.name}
                      </span>
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={!hidden.has(UNCATEGORIZED_FILTER_ID)}
                  onClick={() => toggleHidden(UNCATEGORIZED_FILTER_ID)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-100 hover:bg-cream-deep/40"
                >
                  <span
                    aria-hidden
                    className={[
                      "flex size-4 items-center justify-center rounded-md border transition-colors duration-100",
                      !hidden.has(UNCATEGORIZED_FILTER_ID)
                        ? "border-accent bg-accent text-cream"
                        : "border-rule bg-surface",
                    ].join(" ")}
                  >
                    {!hidden.has(UNCATEGORIZED_FILTER_ID) && (
                      <Check className="size-3" strokeWidth={2.5} />
                    )}
                  </span>
                  <span aria-hidden className="size-2 rounded-full bg-muted" />
                  <span className="flex-1 text-[14px] italic text-ink-soft">
                    Uncategorized
                  </span>
                </button>
              </li>
            </ul>

            <div className="border-t border-rule">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setManagerOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-mono text-[11px] tracking-wider uppercase text-ink-soft transition-colors duration-150 hover:bg-cream-deep/40 hover:text-ink"
              >
                <Settings2 className="size-3.5" />
                Manage &amp; reset categories
              </button>
            </div>
          </div>
        )}
      </div>

      {managerOpen && (
        <CategoryManager onClose={() => setManagerOpen(false)} />
      )}
    </>
  );
}
