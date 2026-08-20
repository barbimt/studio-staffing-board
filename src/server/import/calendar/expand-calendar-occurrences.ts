import ical, { type RRule, type VEvent } from "node-ical";

import {
  CalendarImportError,
  type CalendarEventDraft,
  type CalendarOccurrence,
} from "./calendar.schema";
import { allDayCalendarDate, calendarDateInTimeZone } from "./calendar-dates";

function formatEventIssue(event: CalendarEventDraft, message: string): string {
  return `Event "${event.summary}" (UID ${event.uid}): ${message}`;
}

function rruleIsBounded(rrule: RRule): boolean {
  const until = rrule.options.until;
  const count = rrule.options.count;

  return until != null || (typeof count === "number" && Number.isFinite(count));
}

function occurrenceFromEvent(event: CalendarEventDraft): CalendarOccurrence {
  return {
    startDate: event.startDate,
    endDate: event.endDate,
    startAt: event.startAt,
    endAt: event.endAt,
  };
}

function occurrenceFromInstance(
  event: CalendarEventDraft,
  instance: { start: Date; end: Date },
): CalendarOccurrence {
  if (event.isAllDay) {
    return {
      startDate: allDayCalendarDate(instance.start),
      endDate: allDayCalendarDate(instance.end),
      startAt: null,
      endAt: null,
    };
  }

  const timeZone = event.timeZone;

  if (!timeZone) {
    throw new CalendarImportError(
      formatEventIssue(event, "timed events require a timezone"),
    );
  }

  const startDate = calendarDateInTimeZone(instance.start, timeZone);
  const endDate = calendarDateInTimeZone(instance.end, timeZone);

  if (!startDate || !endDate) {
    throw new CalendarImportError("Timed event calendar date is invalid");
  }

  return {
    startDate,
    endDate,
    startAt: instance.start,
    endAt: instance.end,
  };
}

function assertUniqueOccurrenceDates(
  event: CalendarEventDraft,
  occurrences: CalendarOccurrence[],
): void {
  const seen = new Set<string>();

  for (const occurrence of occurrences) {
    if (seen.has(occurrence.startDate)) {
      throw new CalendarImportError(
        formatEventIssue(
          event,
          `duplicate occurrence start date ${occurrence.startDate}`,
        ),
      );
    }

    seen.add(occurrence.startDate);
  }
}

export function expandCalendarOccurrences(
  event: CalendarEventDraft,
  sourceEvent: VEvent,
): CalendarOccurrence[] {
  if (!sourceEvent.rrule) {
    const occurrences = [occurrenceFromEvent(event)];
    assertUniqueOccurrenceDates(event, occurrences);
    return occurrences;
  }

  if (!rruleIsBounded(sourceEvent.rrule)) {
    throw new CalendarImportError(
      formatEventIssue(
        event,
        "RRULE must include UNTIL or COUNT; unbounded recurrence is not imported",
      ),
    );
  }

  const until = sourceEvent.rrule.options.until;
  const lastStart =
    until instanceof Date ? until : sourceEvent.rrule.all().at(-1);

  if (!lastStart) {
    return [];
  }

  const instances = ical.expandRecurringEvent(sourceEvent, {
    from: sourceEvent.start,
    to: lastStart,
  });

  const occurrences = instances.map((instance) =>
    occurrenceFromInstance(event, instance),
  );
  assertUniqueOccurrenceDates(event, occurrences);
  return occurrences;
}
