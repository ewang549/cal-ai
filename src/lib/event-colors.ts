/**
 * Color logic for calendar events.
 *
 * Events get their tone from their assigned CATEGORY (stored on Google as
 * `extendedProperties.private.cal_ai_category`). Events without a category
 * use the neutral "uncategorized" tone.
 *
 * NB: The Tailwind classes below must appear as string literals so the JIT
 * can detect them. Don't construct class names from variables.
 */

import type { Category } from "@/lib/categories";
import type { CalEvent } from "@/lib/google-calendar";

export type EventTone = {
  name: string;
  /** Solid colored bar / dot (e.g. left bar of an event row). */
  bar: string;
  /** Background tint for cells/cards. */
  bgTint: string;
  /** Border color when the chip is colored. */
  border: string;
  /** Hover background for chips. */
  hoverBg: string;
};

export const EVENT_TONES: EventTone[] = [
  {
    name: "accent",
    bar: "bg-accent",
    bgTint: "bg-accent/[0.06]",
    border: "border-accent/30",
    hoverBg: "hover:border-accent/60 hover:bg-accent/[0.06]",
  },
  {
    name: "indigo",
    bar: "bg-indigo-600",
    bgTint: "bg-indigo-100/40",
    border: "border-indigo-600/30",
    hoverBg: "hover:border-indigo-600/60 hover:bg-indigo-100/40",
  },
  {
    name: "emerald",
    bar: "bg-emerald-600",
    bgTint: "bg-emerald-100/40",
    border: "border-emerald-600/30",
    hoverBg: "hover:border-emerald-600/60 hover:bg-emerald-100/40",
  },
  {
    name: "amber",
    bar: "bg-amber-600",
    bgTint: "bg-amber-100/40",
    border: "border-amber-600/30",
    hoverBg: "hover:border-amber-600/60 hover:bg-amber-100/40",
  },
  {
    name: "rose",
    bar: "bg-rose-600",
    bgTint: "bg-rose-100/40",
    border: "border-rose-600/30",
    hoverBg: "hover:border-rose-600/60 hover:bg-rose-100/40",
  },
  {
    name: "violet",
    bar: "bg-violet-600",
    bgTint: "bg-violet-100/40",
    border: "border-violet-600/30",
    hoverBg: "hover:border-violet-600/60 hover:bg-violet-100/40",
  },
  {
    name: "teal",
    bar: "bg-teal-600",
    bgTint: "bg-teal-100/40",
    border: "border-teal-600/30",
    hoverBg: "hover:border-teal-600/60 hover:bg-teal-100/40",
  },
  {
    name: "ink",
    bar: "bg-ink",
    bgTint: "bg-ink/[0.04]",
    border: "border-ink/20",
    hoverBg: "hover:border-ink/40 hover:bg-ink/[0.04]",
  },
];

/** Neutral tone for events that have no category assigned. */
export const UNCATEGORIZED_TONE: EventTone = {
  name: "uncategorized",
  bar: "bg-muted",
  bgTint: "bg-rule/30",
  border: "border-rule",
  hoverBg: "hover:border-ink/30 hover:bg-cream-deep/40",
};

/** Get the category id stored on a Google Calendar event, if any. */
export function getEventCategoryId(event: CalEvent): string | null {
  return (
    event.extendedProperties?.private?.cal_ai_category ?? null
  ) as string | null;
}

/**
 * Get the tone for an event, given the user's category list.
 * Falls back to UNCATEGORIZED_TONE if the event has no category
 * (or the referenced category was deleted).
 */
export function toneForEvent(
  event: CalEvent,
  categories: Category[],
): EventTone {
  const categoryId = getEventCategoryId(event);
  if (!categoryId) return UNCATEGORIZED_TONE;
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return UNCATEGORIZED_TONE;
  const tone = EVENT_TONES.find((t) => t.name === cat.tone);
  return tone ?? UNCATEGORIZED_TONE;
}

/** Look up an EventTone by its name. */
export function toneByName(name: string): EventTone | undefined {
  return EVENT_TONES.find((t) => t.name === name);
}
