import { z } from "zod";

/**
 * Schema for what Claude extracts from a syllabus, and what the import
 * endpoint accepts. All dates / times use the user's local timezone — no
 * UTC offsets here. The import route converts to UTC before sending to
 * Google Calendar.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^\d{2}:\d{2}$/;

export const meetingSchema = z.object({
  days: z.array(
    z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
  ),
  startTime: z.string().regex(HM, "HH:MM"),
  endTime: z.string().regex(HM, "HH:MM"),
  location: z.string().max(200).nullable().optional(),
  firstMeeting: z.string().regex(ISO_DATE, "YYYY-MM-DD"),
  lastMeeting: z.string().regex(ISO_DATE, "YYYY-MM-DD"),
});

export const courseSchema = z.object({
  name: z.string().min(1, "Course name required").max(200),
  code: z.string().max(50).nullable().optional(),
  instructor: z.string().max(200).nullable().optional(),
  term: z.string().max(100).nullable().optional(),
  meetings: z.array(meetingSchema),
});

export const deadlineSchema = z.object({
  type: z.enum([
    "exam",
    "assignment",
    "project",
    "quiz",
    "reading",
    "presentation",
    "other",
  ]),
  title: z.string().min(1).max(200),
  dueDate: z.string().regex(ISO_DATE, "YYYY-MM-DD"),
  dueTime: z.string().regex(HM, "HH:MM").nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
});

export const syllabusSchema = z.object({
  course: courseSchema,
  deadlines: z.array(deadlineSchema),
});

export type Meeting = z.infer<typeof meetingSchema>;
export type Course = z.infer<typeof courseSchema>;
export type Deadline = z.infer<typeof deadlineSchema>;
export type Syllabus = z.infer<typeof syllabusSchema>;
