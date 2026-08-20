import { readFileSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb, type AppDatabase } from "../../db/client";
import {
  assignments,
  calendarEventOccurrences,
  calendarEvents,
  people,
  projects,
} from "../../db/schema";
import { importPeople } from "../people/import-people";
import { parsePeopleCsv } from "../people/parse-people-csv";
import { readCalendarFixture, readSourceFile } from "./calendar-test-helpers";
import { importCalendar } from "./import-calendar";
import { parseCalendar } from "./parse-calendar";

function applyDatabaseUrlFromEnvFile() {
  if (process.env.DATABASE_URL) {
    return;
  }

  try {
    const envFile = readFileSync(path.resolve(process.cwd(), ".env"), "utf8");

    for (const line of envFile.split("\n")) {
      const match = /^DATABASE_URL=(.*)$/.exec(line.trim());
      if (match) {
        process.env.DATABASE_URL = match[1];
        return;
      }
    }
  } catch {
    // No local .env (CI).
  }
}

applyDatabaseUrlFromEnvFile();

const peopleCsv = `Employee ID,First Name,Last Name,Work Email,Department,Job Title,Site,FTE,Start Date,End Date,Manager Email
E002,Alex,Turner,alex.turner@example.com,Engineering,Lead Developer,Bristol,1.0,2022-06-13,,
E003,Maria,Costa,maria.costa@example.com,Engineering,Developer,Porto,0.8,2023-02-01,,
`;

const standupUntilOctober = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Example Studio//Calendar Export//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:standup-recurring@example.com
SUMMARY:Studio Standup
DTSTART;TZID=Europe/London:20260803T093000
DTEND;TZID=Europe/London:20260803T100000
RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261012T235900Z
CATEGORIES:CEREMONY
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
`;

const standupUntilSeptember = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Example Studio//Calendar Export//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:standup-recurring@example.com
SUMMARY:Studio Standup
DTSTART;TZID=Europe/London:20260803T093000
DTEND;TZID=Europe/London:20260803T100000
RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20260907T235900Z
CATEGORIES:CEREMONY
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
`;

describe.skipIf(!process.env.DATABASE_URL)("importCalendar", () => {
  let db: AppDatabase;

  async function tableCount(
    table:
      typeof people | typeof calendarEvents | typeof calendarEventOccurrences,
  ) {
    const [row] = await db.select({ count: count() }).from(table);
    return Number(row?.count ?? 0);
  }

  async function eventByUid(uid: string) {
    const [row] = await db
      .select({
        id: calendarEvents.id,
        uid: calendarEvents.uid,
        personId: calendarEvents.personId,
        appliesToRegion: calendarEvents.appliesToRegion,
        category: calendarEvents.category,
        timeZone: calendarEvents.timeZone,
        rrule: calendarEvents.rrule,
      })
      .from(calendarEvents)
      .where(eq(calendarEvents.uid, uid));

    return row;
  }

  async function occurrencesForEvent(eventId: number) {
    return db
      .select({
        id: calendarEventOccurrences.id,
        eventId: calendarEventOccurrences.eventId,
        startDate: calendarEventOccurrences.startDate,
        endDate: calendarEventOccurrences.endDate,
      })
      .from(calendarEventOccurrences)
      .where(eq(calendarEventOccurrences.eventId, eventId));
  }

  beforeAll(async () => {
    db = createDb();
  });

  beforeEach(async () => {
    await db.delete(calendarEventOccurrences);
    await db.delete(calendarEvents);
    await db.delete(assignments);
    await db.delete(projects);
    await db.delete(people);
    await importPeople(db, parsePeopleCsv(peopleCsv));
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it("upserts events and occurrences without duplicating or changing event ids", async () => {
    const records = parseCalendar(readCalendarFixture("all-day-leave.ics"));

    await importCalendar(db, records);
    expect(await tableCount(calendarEvents)).toBe(1);
    expect(await tableCount(calendarEventOccurrences)).toBe(1);

    const before = await eventByUid("leave-0004@example.com");
    const beforeOccurrences = await occurrencesForEvent(before?.id ?? 0);

    await importCalendar(db, records);
    expect(await tableCount(calendarEvents)).toBe(1);
    expect(await tableCount(calendarEventOccurrences)).toBe(1);

    const after = await eventByUid("leave-0004@example.com");
    const afterOccurrences = await occurrencesForEvent(after?.id ?? 0);

    expect(after?.id).toBe(before?.id);
    expect(afterOccurrences.map((row) => row.id).sort()).toEqual(
      beforeOccurrences.map((row) => row.id).sort(),
    );
  });

  it("links leave to canonical people and keeps holidays and ceremonies global", async () => {
    await importPeople(db, parsePeopleCsv(readSourceFile("people-export.csv")));

    await importCalendar(
      db,
      parseCalendar(readSourceFile("leave-calendar.ics")),
    );

    expect(await tableCount(calendarEvents)).toBe(16);
    expect(await tableCount(calendarEventOccurrences)).toBe(26);

    const maria = await eventByUid("leave-0004@example.com");
    const [mariaPerson] = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.workEmail, "maria.costa@example.com"));

    expect(maria?.personId).toBe(mariaPerson?.id);
    expect(maria?.appliesToRegion).toBeNull();

    const ukHoliday = await eventByUid("hol-uk-0001@example.com");
    expect(ukHoliday?.personId).toBeNull();
    expect(ukHoliday?.appliesToRegion).toBe("UK");

    const ptHoliday = await eventByUid("hol-pt-0001@example.com");
    expect(ptHoliday?.personId).toBeNull();
    expect(ptHoliday?.appliesToRegion).toBe("PT");

    const ceremony = await eventByUid("offsite-0001@example.com");
    expect(ceremony?.personId).toBeNull();
    expect(ceremony?.appliesToRegion).toBeNull();

    const standup = await eventByUid("standup-recurring@example.com");
    expect(standup?.personId).toBeNull();
    expect(standup?.timeZone).toBe("Europe/London");
    expect(await occurrencesForEvent(standup?.id ?? 0)).toHaveLength(11);
  });

  it("removes stale occurrences when a recurrence snapshot shrinks", async () => {
    await importCalendar(db, parseCalendar(standupUntilOctober));

    const standup = await eventByUid("standup-recurring@example.com");
    expect(await occurrencesForEvent(standup?.id ?? 0)).toHaveLength(11);

    await importCalendar(db, parseCalendar(standupUntilSeptember));

    expect((await eventByUid("standup-recurring@example.com"))?.id).toBe(
      standup?.id,
    );
    const remaining = await occurrencesForEvent(standup?.id ?? 0);
    expect(remaining).toHaveLength(6);
    expect(remaining.map((row) => row.startDate).sort()).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
      "2026-09-07",
    ]);
  });

  it("persists nothing when a leave attendee cannot be matched", async () => {
    await expect(
      importCalendar(
        db,
        parseCalendar(readCalendarFixture("unmatched-leave.ics")),
      ),
    ).rejects.toThrow(
      /attendee "nobody@example.com" could not be matched to a canonical person/,
    );

    expect(await tableCount(calendarEvents)).toBe(0);
    expect(await tableCount(calendarEventOccurrences)).toBe(0);
  });
});
