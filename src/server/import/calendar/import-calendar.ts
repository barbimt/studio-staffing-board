import { and, inArray, notInArray, sql } from "drizzle-orm";

import { type AppDatabase } from "../../db/client";
import {
  calendarEventOccurrences,
  calendarEvents,
  people,
} from "../../db/schema";
import { matchCalendarPeople } from "./match-calendar-people";
import {
  CalendarImportError,
  type ImportedCalendarEvent,
} from "./calendar.schema";

export async function importCalendar(
  database: AppDatabase,
  records: ImportedCalendarEvent[],
): Promise<{ eventCount: number; occurrenceCount: number }> {
  if (records.length === 0) {
    return { eventCount: 0, occurrenceCount: 0 };
  }

  const occurrenceCount = records.reduce(
    (total, event) => total + event.occurrences.length,
    0,
  );

  try {
    const peopleRows = await database
      .select({
        id: people.id,
        workEmail: people.workEmail,
      })
      .from(people);

    const resolved = matchCalendarPeople(records, peopleRows);

    await database.transaction(async (tx) => {
      const upsertedEvents = await tx
        .insert(calendarEvents)
        .values(
          resolved.map((event) => ({
            uid: event.uid,
            personId: event.personId,
            appliesToRegion: event.appliesToRegion,
            summary: event.summary,
            category: event.category,
            status: event.status ?? "",
            isAllDay: event.isAllDay,
            startDate: event.startDate,
            endDate: event.endDate,
            startAt: event.startAt,
            endAt: event.endAt,
            timeZone: event.timeZone,
            rrule: event.rrule,
          })),
        )
        .onConflictDoUpdate({
          target: calendarEvents.uid,
          set: {
            personId: sql`excluded.person_id`,
            appliesToRegion: sql`excluded.applies_to_region`,
            summary: sql`excluded.summary`,
            category: sql`excluded.category`,
            status: sql`excluded.status`,
            isAllDay: sql`excluded.is_all_day`,
            startDate: sql`excluded.start_date`,
            endDate: sql`excluded.end_date`,
            startAt: sql`excluded.start_at`,
            endAt: sql`excluded.end_at`,
            timeZone: sql`excluded.time_zone`,
            rrule: sql`excluded.rrule`,
          },
        })
        .returning({ id: calendarEvents.id, uid: calendarEvents.uid });

      const eventIdByUid = new Map(
        upsertedEvents.map((event) => [event.uid, event.id]),
      );

      const snapshotOccurrences: {
        eventId: number;
        startDate: string;
        endDate: string;
        startAt: Date | null;
        endAt: Date | null;
      }[] = [];
      const eventIdsWithOccurrences: number[] = [];
      const eventIdsWithoutOccurrences: number[] = [];

      for (const event of resolved) {
        const eventId = eventIdByUid.get(event.uid);

        if (eventId === undefined) {
          throw new CalendarImportError("Calendar import failed");
        }

        if (event.occurrences.length === 0) {
          eventIdsWithoutOccurrences.push(eventId);
          continue;
        }

        eventIdsWithOccurrences.push(eventId);

        for (const occurrence of event.occurrences) {
          snapshotOccurrences.push({
            eventId,
            startDate: occurrence.startDate,
            endDate: occurrence.endDate,
            startAt: occurrence.startAt,
            endAt: occurrence.endAt,
          });
        }
      }

      if (snapshotOccurrences.length > 0) {
        const upsertedOccurrences = await tx
          .insert(calendarEventOccurrences)
          .values(snapshotOccurrences)
          .onConflictDoUpdate({
            target: [
              calendarEventOccurrences.eventId,
              calendarEventOccurrences.startDate,
            ],
            set: {
              endDate: sql`excluded.end_date`,
              startAt: sql`excluded.start_at`,
              endAt: sql`excluded.end_at`,
            },
          })
          .returning({ id: calendarEventOccurrences.id });

        await tx.delete(calendarEventOccurrences).where(
          and(
            inArray(calendarEventOccurrences.eventId, eventIdsWithOccurrences),
            notInArray(
              calendarEventOccurrences.id,
              upsertedOccurrences.map((row) => row.id),
            ),
          ),
        );
      }

      if (eventIdsWithoutOccurrences.length > 0) {
        await tx
          .delete(calendarEventOccurrences)
          .where(
            inArray(
              calendarEventOccurrences.eventId,
              eventIdsWithoutOccurrences,
            ),
          );
      }
    });
  } catch (error) {
    if (error instanceof CalendarImportError) {
      throw error;
    }

    throw new CalendarImportError("Calendar import failed");
  }

  return { eventCount: records.length, occurrenceCount };
}
