"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { useCategories } from "@/components/dashboard/category-context";
import { Button } from "@/components/ui/button";
import { EVENT_TONES, toneByName } from "@/lib/event-colors";

/**
 * Modal for CRUD on the user's categories. Add new, rename, change tone,
 * or delete. Changes write through to localStorage via the context.
 */
export function CategoryManager({ onClose }: { onClose: () => void }) {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    resetToDefaults,
  } = useCategories();
  const ref = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTone, setEditTone] = useState("indigo");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTone, setNewTone] = useState("indigo");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function startEdit(id: string) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    setEditingId(id);
    setEditName(cat.name);
    setEditTone(cat.tone);
  }

  function saveEdit() {
    if (!editingId || !editName.trim()) return;
    updateCategory(editingId, { name: editName.trim(), tone: editTone });
    setEditingId(null);
  }

  function handleAdd() {
    if (!newName.trim()) return;
    addCategory(newName.trim(), newTone);
    setNewName("");
    setNewTone("indigo");
    setAdding(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Manage categories"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_40px_100px_-30px_rgba(26,22,18,0.5)]"
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
          <div>
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
              Categories
            </div>
            <div className="font-display mt-1 text-xl tracking-tight text-ink">
              Color your calendar
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-cream-deep hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto py-1">
          {categories.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-muted">
              No categories yet. Add one below.
            </li>
          )}
          {categories.map((cat) => {
            const tone = toneByName(cat.tone);
            const isEditing = editingId === cat.id;
            if (isEditing) {
              return (
                <li
                  key={cat.id}
                  className="border-b border-rule/40 bg-cream-deep/30 px-5 py-3"
                >
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    aria-label="Category name"
                    className="h-9 w-full rounded-lg border border-rule bg-surface px-3 text-[14px] text-ink outline-none focus:border-accent"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <TonePicker selected={editTone} onChange={setEditTone} />
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveEdit} disabled={!editName.trim()}>
                      <Check className="mr-1 size-3.5" strokeWidth={2.5} />
                      Save
                    </Button>
                  </div>
                </li>
              );
            }
            return (
              <li
                key={cat.id}
                className="flex items-center gap-3 border-b border-rule/40 px-5 py-2.5 last:border-b-0"
              >
                <span
                  aria-hidden
                  className={`size-3 shrink-0 rounded-full ${tone?.bar ?? "bg-muted"}`}
                />
                <span className="flex-1 text-[14px] text-ink">{cat.name}</span>
                <button
                  type="button"
                  onClick={() => startEdit(cat.id)}
                  aria-label={`Edit ${cat.name}`}
                  className="flex size-7 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-cream-deep hover:text-ink"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      typeof window !== "undefined" &&
                      window.confirm(
                        `Delete category "${cat.name}"? Events already tagged with it will become uncategorized.`,
                      )
                    ) {
                      deleteCategory(cat.id);
                    }
                  }}
                  aria-label={`Delete ${cat.name}`}
                  className="flex size-7 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-accent/10 hover:text-accent"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>

        {adding ? (
          <div className="border-t border-rule bg-cream-deep/30 px-5 py-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              placeholder="Category name"
              aria-label="New category name"
              className="h-9 w-full rounded-lg border border-rule bg-surface px-3 text-[14px] text-ink outline-none focus:border-accent"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <TonePicker selected={newTone} onChange={setNewTone} />
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
                <Plus className="mr-1 size-3.5" strokeWidth={2.5} />
                Add
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between border-t border-rule px-3 py-2">
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] font-medium text-ink-soft transition-colors duration-150 hover:bg-cream-deep/40 hover:text-ink"
            >
              <Plus className="size-3.5" />
              New category
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  window.confirm(
                    "Reset to the default categories (Class, Project, Personal, Misc)? Your custom categories will be removed.",
                  )
                ) {
                  resetToDefaults();
                }
              }}
              className="rounded-lg px-3 py-2 font-mono text-[11px] tracking-wider uppercase text-muted transition-colors duration-150 hover:bg-cream-deep/40 hover:text-ink"
            >
              Reset to defaults
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TonePicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (toneName: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Pick a color"
      className="mt-3 flex flex-wrap gap-2"
    >
      {EVENT_TONES.map((tone) => (
        <button
          key={tone.name}
          type="button"
          role="radio"
          aria-checked={selected === tone.name}
          aria-label={tone.name}
          onClick={() => onChange(tone.name)}
          className={[
            "flex size-7 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-surface transition-all duration-150",
            tone.bar,
            selected === tone.name
              ? "ring-ink"
              : "ring-transparent hover:ring-rule",
          ].join(" ")}
        >
          {selected === tone.name && (
            <Check className="size-3.5 text-cream" strokeWidth={2.5} />
          )}
        </button>
      ))}
    </div>
  );
}
