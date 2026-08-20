import ical, { type VEvent } from "node-ical";

import { expandCalendarOccurrences } from "./expand-calendar-occurrences";
import { allDayCalendarDate, calendarDateInTimeZone } from "./calendar-dates";
import {
  CalendarImportError,
  importedCalendarEventSchema,
  LEAVE_CATEGORY,
  normalizeEmail,
  regionForCategory,
  type CalendarEventDraft,
  type ImportedCalendarEvent,
} from "./calendar.schema";

function isVEvent(value: unknown): value is VEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "VEVENT"
  );
}

function textValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "val" in value &&
    typeof value.val === "string"
  ) {
    return value.val;
  }

  return null;
}

function formatEventIssue(
  uid: string | null,
  summary: string | null,
  message: string,
): string {
  if (uid && summary) {
    return `Event "${summary}" (UID ${uid}): ${message}`;
  }

  if (uid) {
    return `Event UID ${uid}: ${message}`;
  }

  return `Calendar event: ${message}`;
}

function categoryList(categories: unknown): string[] {
  if (categories == null) {
    return [];
  }

  if (typeof categories === "string") {
    const trimmed = categories.trim();
    return trimmed === "" ? [] : [trimmed];
  }

  if (!Array.isArray(categories)) {
    return [];
  }

  return categories
    .map((category) => (typeof category === "string" ? category.trim() : ""))
    .filter((category) => category.length > 0);
}

function attendeeValues(attendee: unknown): unknown[] {
  if (attendee == null) {
    return [];
  }

  return Array.isArray(attendee) ? attendee : [attendee];
}

function attendeeEmailFromValue(value: unknown): string | null {
  const raw = textValue(value);

  if (!raw) {
    return null;
  }

  const withoutMailto = raw.replace(/^mailto:/i, "");
  const normalized = normalizeEmail(withoutMailto);
  return normalized === "" ? null : normalized;
}

function uniqueAttendeeEmails(attendee: unknown): string[] {
  const emails: string[] = [];
  const seen = new Set<string>();

  for (const value of attendeeValues(attendee)) {
    const email = attendeeEmailFromValue(value);

    if (!email || seen.has(email)) {
      continue;
    }

    seen.add(email);
    emails.push(email);
  }

  return emails;
}

function hasUnsupportedExceptions(event: VEvent): boolean {
  if (event.recurrenceid) {
    return true;
  }

  if (event.exdate && Object.keys(event.exdate).length > 0) {
    return true;
  }

  if (event.recurrences && Object.keys(event.recurrences).length > 0) {
    return true;
  }

  return false;
}

function rruleText(rrule: VEvent["rrule"]): string | null {
  if (!rrule) {
    return null;
  }

  const serialized = rrule.toString();
  const line = serialized
    .split("\n")
    .find((entry) => entry.startsWith("RRULE:"));

  return line ? line.slice("RRULE:".length) : serialized;
}

function optionalStatus(value: unknown): string | null {
  const raw = textValue(value);

  if (raw == null) {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function draftFromVEvent(event: VEvent): CalendarEventDraft {
  const uid = event.uid.trim();
  const summary = textValue(event.summary)?.trim() ?? "";
  const categories = categoryList(event.categories);
  const status = optionalStatus(event.status);
  const isAllDay = event.datetype === "date" || event.start.dateOnly === true;

  if (!uid) {
    throw new CalendarImportError("UID is required");
  }

  if (!summary) {
    throw new CalendarImportError(
      formatEventIssue(uid, null, "SUMMARY is required"),
    );
  }

  if (categories.length === 0) {
    throw new CalendarImportError(
      formatEventIssue(uid, summary, "CATEGORIES is required"),
    );
  }

  if (categories.length > 1) {
    throw new CalendarImportError(
      formatEventIssue(
        uid,
        summary,
        "exactly one CATEGORIES value is required",
      ),
    );
  }

  const category = categories[0] ?? "";

  if (hasUnsupportedExceptions(event)) {
    throw new CalendarImportError(
      formatEventIssue(
        uid,
        summary,
        "EXDATE and RECURRENCE-ID are not supported",
      ),
    );
  }

  if (!event.end) {
    throw new CalendarImportError(
      formatEventIssue(uid, summary, "DTEND is required"),
    );
  }

  const attendeeEmails = uniqueAttendeeEmails(event.attendee);
  let attendeeEmail: string | null = null;

  if (category === LEAVE_CATEGORY) {
    if (attendeeEmails.length !== 1) {
      throw new CalendarImportError(
        formatEventIssue(
          uid,
          summary,
          "LEAVE events must have exactly one attendee email",
        ),
      );
    }

    attendeeEmail = attendeeEmails[0] ?? null;
  }

  let startDate: string;
  let endDate: string;
  let startAt: Date | null = null;
  let endAt: Date | null = null;
  let timeZone: string | null = null;

  if (isAllDay) {
    startDate = allDayCalendarDate(event.start);
    endDate = allDayCalendarDate(event.end);
  } else {
    timeZone = event.start.tz ?? event.end.tz ?? null;

    if (!timeZone) {
      throw new CalendarImportError(
        formatEventIssue(uid, summary, "timed events require TZID"),
      );
    }

    startAt = event.start;
    endAt = event.end;
    startDate = calendarDateInTimeZone(event.start, timeZone);
    endDate = calendarDateInTimeZone(event.end, timeZone);

    if (!startDate || !endDate) {
      throw new CalendarImportError(
        formatEventIssue(uid, summary, "timed event dates are invalid"),
      );
    }
  }

  return {
    uid,
    summary,
    category,
    status,
    attendeeEmail,
    appliesToRegion: regionForCategory(category),
    isAllDay,
    startDate,
    endDate,
    startAt,
    endAt,
    timeZone,
    rrule: rruleText(event.rrule),
  };
}

export function parseCalendar(icsText: string): ImportedCalendarEvent[] {
  const parsed = ical.sync.parseICS(icsText);
  const sourceEvents = Object.values(parsed).filter(isVEvent);
  const errors: string[] = [];
  const events: ImportedCalendarEvent[] = [];
  const seenUids = new Set<string>();

  for (const sourceEvent of sourceEvents) {
    try {
      const draft = draftFromVEvent(sourceEvent);

      if (seenUids.has(draft.uid)) {
        throw new CalendarImportError(
          formatEventIssue(draft.uid, draft.summary, "UID is duplicated"),
        );
      }

      seenUids.add(draft.uid);

      const occurrences = expandCalendarOccurrences(draft, sourceEvent);
      const result = importedCalendarEventSchema.safeParse({
        ...draft,
        occurrences,
      });

      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push(
            formatEventIssue(draft.uid, draft.summary, issue.message),
          );
        }
        continue;
      }

      events.push(result.data);
    } catch (error) {
      if (error instanceof CalendarImportError) {
        errors.push(...error.messages);
        continue;
      }

      errors.push(
        formatEventIssue(
          sourceEvent.uid ?? null,
          textValue(sourceEvent.summary),
          "event is invalid",
        ),
      );
    }
  }

  if (errors.length > 0) {
    throw new CalendarImportError(errors);
  }

  return events;
}
