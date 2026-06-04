"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Category,
  DEFAULT_CATEGORIES,
  loadCategories,
  newCategoryId,
  resetCategoriesToDefaults,
  saveCategories,
} from "@/lib/categories";

/**
 * Provides the user's category list + the active filter set to any
 * descendant component. Categories live in localStorage; filter state
 * is in-memory (resets per session).
 *
 * The `hidden` set tracks which category ids the user has *hidden*
 * (the inverse — visible categories — is the implicit default). We
 * use "hidden" so an empty set means "show everything", which matches
 * a fresh visit.
 */

type CategoryContextValue = {
  categories: Category[];
  hidden: Set<string>;
  /** Toggle whether a category id is hidden in the filter. */
  toggleHidden: (id: string) => void;
  /** Show everything again. */
  resetFilter: () => void;
  /** Add a new category and return it. */
  addCategory: (name: string, tone: string) => Category;
  /** Update name/tone of an existing category. */
  updateCategory: (id: string, patch: Partial<Omit<Category, "id">>) => void;
  /** Remove a category by id. */
  deleteCategory: (id: string) => void;
  /** Restore the default Class / Project / Personal / Misc set. */
  resetToDefaults: () => void;
  /** Whether an event with the given (possibly null) category id is currently visible. */
  isVisible: (categoryId: string | null) => boolean;
};

const CategoryContext = createContext<CategoryContextValue | null>(null);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    setCategories(loadCategories());
  }, []);

  // Persist any change to localStorage.
  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  const toggleHidden = useCallback((id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const resetFilter = useCallback(() => setHidden(new Set()), []);

  const addCategory = useCallback((name: string, tone: string): Category => {
    const cat: Category = { id: newCategoryId(), name: name.trim(), tone };
    setCategories((prev) => [...prev, cat]);
    return cat;
  }, []);

  const updateCategory = useCallback(
    (id: string, patch: Partial<Omit<Category, "id">>) => {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setHidden((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaults = resetCategoriesToDefaults();
    setCategories(defaults);
    setHidden(new Set());
  }, []);

  const isVisible = useCallback(
    (categoryId: string | null) => {
      // "Uncategorized" events use the special id "__uncategorized__" in the
      // filter UI — they're hidden if that placeholder is in the hidden set.
      const key = categoryId ?? "__uncategorized__";
      return !hidden.has(key);
    },
    [hidden],
  );

  const value = useMemo<CategoryContextValue>(
    () => ({
      categories,
      hidden,
      toggleHidden,
      resetFilter,
      addCategory,
      updateCategory,
      deleteCategory,
      resetToDefaults,
      isVisible,
    }),
    [
      categories,
      hidden,
      toggleHidden,
      resetFilter,
      addCategory,
      updateCategory,
      deleteCategory,
      resetToDefaults,
      isVisible,
    ],
  );

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories(): CategoryContextValue {
  const ctx = useContext(CategoryContext);
  if (!ctx) {
    throw new Error("useCategories must be used inside <CategoryProvider>");
  }
  return ctx;
}

/** Placeholder id used in the filter UI to represent "events with no category". */
export const UNCATEGORIZED_FILTER_ID = "__uncategorized__";
