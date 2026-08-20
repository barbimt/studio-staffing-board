import { z } from "zod";

export class CalendarImportError extends Error {
  readonly messages: string[];

  constructor(messages: string | string[]) {
    const list = Array.isArray(messages) ? messages : [messages];
    super(list.join("\n"));
    this.name = "CalendarImportError";
    this.messages = list;
  }
}

const HOLIDAY_REGION_BY_CATEGORY: Record<string, string> = {
  "HOLIDAY-UK": "UK",
  "HOLIDAY-PT": "PT",
};

export const LEAVE_CATEGORY = "LEAVE";

export function regionForCategory(category: string): string | null {
  return HOLIDAY_REGION_BY_CATEGORY[category] ?? null;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const calendarDateSchema = z.iso.date({ error: "Date is invalid" });

export const calendarOccurrenceSchema = z.object({
  startDate: calendarDateSchema,
  endDate: calendarDateSchema,
  startAt: z.date().nullable(),
  endAt: z.date().nullable(),
});

export const importedCalendarEventSchema = z.object({
  uid: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  category: z.string().trim().min(1),
  status: z.string().trim().min(1).nullable(),
  attendeeEmail: z.string().trim().min(1).nullable(),
  appliesToRegion: z.string().trim().min(1).nullable(),
  isAllDay: z.boolean(),
  startDate: calendarDateSchema,
  endDate: calendarDateSchema,
  startAt: z.date().nullable(),
  endAt: z.date().nullable(),
  timeZone: z.string().trim().min(1).nullable(),
  rrule: z.string().trim().min(1).nullable(),
  occurrences: z.array(calendarOccurrenceSchema),
});

export type CalendarOccurrence = z.infer<typeof calendarOccurrenceSchema>;
export type ImportedCalendarEvent = z.infer<typeof importedCalendarEventSchema>;
export type CalendarEventDraft = Omit<ImportedCalendarEvent, "occurrences">;

export type ResolvedCalendarEvent = ImportedCalendarEvent & {
  personId: number | null;
};
