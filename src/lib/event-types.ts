/**
 * Event "type" is a separate dimension from "category".
 *
 *   - CATEGORY is user-defined (Class / Project / Personal / Misc, etc.) and
 *     controls the color. Stored in extendedProperties.private.cal_ai_category.
 *   - TYPE is fixed (event / class / assignment / exam / project / …) and
 *     controls behavior (e.g. assignments stay visible past their due date as
 *     "overdue"). Stored in extendedProperties.private.cal_ai_type.
 */

import type { CalEvent } from "@/lib/google-calendar";

export type EventType =
  | "event"
  | "class"
  | "assignment"
  | "exam"
  | "quiz"
  | "project"
  | "study"
  | "meeting"
  | "other";

export const EVENT_TYPES: { id: EventType; label: string }[] = [
  { id: "event", label: "Event" },
  { id: "class", label: "Class" },
  { id: "assignment", label: "Assignment" },
  { id: "exam", label: "Exam" },
  { id: "quiz", label: "Quiz" },
  { id: "project", label: "Project" },
  { id: "study", label: "Study" },
  { id: "meeting", label: "Meeting" },
  { id: "other", label: "Other" },
];

const TYPE_IDS = new Set(EVENT_TYPES.map((t) => t.id));

export function getEventType(event: CalEvent): EventType | null {
  const t = event.extendedProperties?.private?.cal_ai_type;
  if (typeof t === "string" && TYPE_IDS.has(t as EventType)) {
    return t as EventType;
  }
  return null;
}

export function isAssignmentLike(type: EventType | null): boolean {
  return type === "assignment" || type === "project";
}

/** Display label for a type, falling back to "Event" when unset. */
export function typeLabel(type: EventType | null): string {
  if (!type) return "Event";
  const entry = EVENT_TYPES.find((t) => t.id === type);
  return entry?.label ?? "Event";
}
