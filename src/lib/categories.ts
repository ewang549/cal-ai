/**
 * User-defined event categories ("Class", "Project", etc.).
 *
 * Stored in localStorage so they're per-browser. Each category has a
 * stable id, a user-edited name, and a tone name (matching one of the
 * tone names in event-colors.ts). Events on Google Calendar reference
 * a category by its id, stored in `extendedProperties.private.cal_ai_category`.
 */

export type Category = {
  id: string;
  name: string;
  tone: string; // matches EventTone.name
};

const STORAGE_KEY = "cal-ai:categories";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat_class", name: "Class", tone: "indigo" },
  { id: "cat_project", name: "Project", tone: "emerald" },
  { id: "cat_personal", name: "Personal", tone: "rose" },
  { id: "cat_misc", name: "Misc", tone: "amber" },
];

export function loadCategories(): Category[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_CATEGORIES;
    return parsed
      .filter(
        (c): c is Category =>
          typeof c === "object" &&
          c !== null &&
          typeof c.id === "string" &&
          typeof c.name === "string" &&
          typeof c.tone === "string",
      )
      .slice(0, 20); // reasonable cap
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch {
    // localStorage may be unavailable (private mode); just no-op
  }
}

/** Generate a short, opaque id for a new category. */
export function newCategoryId(): string {
  return `cat_${Math.random().toString(36).slice(2, 10)}`;
}
