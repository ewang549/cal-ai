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
    const filtered = parsed
      .filter(
        (c): c is Category =>
          typeof c === "object" &&
          c !== null &&
          typeof c.id === "string" &&
          typeof c.name === "string" &&
          typeof c.tone === "string",
      )
      .slice(0, 20); // reasonable cap

    if (filtered.length === 0) return DEFAULT_CATEGORIES;

    // Self-heal: if persisted state is a strict subset of the defaults and
    // is incomplete (e.g. legacy state with only "Class"), top it up with the
    // missing defaults. Custom user categories aren't disturbed because they
    // wouldn't match a default id.
    const allMatchDefaults = filtered.every((c) =>
      DEFAULT_CATEGORIES.some((d) => d.id === c.id),
    );
    if (allMatchDefaults && filtered.length < DEFAULT_CATEGORIES.length) {
      const presentIds = new Set(filtered.map((c) => c.id));
      const missing = DEFAULT_CATEGORIES.filter((d) => !presentIds.has(d.id));
      return [...filtered, ...missing];
    }

    return filtered;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

/** Wipe persisted categories and return to the defaults. */
export function resetCategoriesToDefaults(): Category[] {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore — private mode or quota
    }
  }
  return DEFAULT_CATEGORIES;
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
