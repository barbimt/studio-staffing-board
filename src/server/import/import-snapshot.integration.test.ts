import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";

import { getMonthlyCapacity } from "@/server/capacity/get-monthly-capacity";
import {
  assignments,
  calendarEventOccurrences,
  calendarEvents,
  people,
  projects,
} from "@/server/db/schema";
import { readCalendarFixture } from "@/server/import/calendar/calendar-test-helpers";
import {
  importStudioData,
  StudioImportError,
} from "@/server/import/import-studio-data";
import {
  createTestDb,
  resetStaffingTables,
  testDatabaseUrl,
} from "@/test/integration-db";

const peopleHeader =
  "Employee ID,First Name,Last Name,Work Email,Department,Job Title,Site,FTE,Start Date,End Date,Manager Email";

function peopleCsv(
  rows: {
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
  }[],
) {
  return [
    peopleHeader,
    ...rows.map(
      (row) =>
        `${row.employeeId},${row.firstName},${row.lastName},${row.email},Engineering,Developer,Bristol,1.0,2022-01-01,,`,
    ),
  ].join("\n");
}

const alex = {
  employeeId: "E002",
  firstName: "Alex",
  lastName: "Turner",
  email: "alex.turner@example.com",
};
const maria = {
  employeeId: "E003",
  firstName: "Maria",
  lastName: "Costa",
  email: "maria.costa@example.com",
};
const priya = {
  employeeId: "E005",
  firstName: "Priya",
  lastName: "Nair",
  email: "priya.nair@example.com",
};

const projectsHeader =
  "Name,Status,Client,Platform,Start,End,Team,Allocation %";

function projectsCsv(
  rows: { name: string; team: string; allocations: string }[],
) {
  return [
    projectsHeader,
    ...rows.map(
      (row) =>
        `${row.name},Active,Bluebird,PC,2026-05-04,2026-12-18,"${row.team}","${row.allocations}"`,
    ),
  ].join("\n");
}

function holidayEvent(uid: string, summary: string) {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `SUMMARY:${summary}`,
    "DTSTART;VALUE=DATE:20260831",
    "DTEND;VALUE=DATE:20260901",
    "CATEGORIES:HOLIDAY-UK",
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ].join("\n");
}

function calendarIcs(...events: string[]) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Example Studio//Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\n");
}

const holidayA = holidayEvent("UID-A", "Holiday A");
const holidayB = holidayEvent("UID-B", "Holiday B");
const emptyHolidayCalendar = calendarIcs(holidayB);
const twoHolidayCalendar = calendarIcs(holidayA, holidayB);

const threePeople = peopleCsv([alex, maria, priya]);
const twoPeople = peopleCsv([maria, priya]);
const lanternOnly = projectsCsv([
  { name: "Lantern", team: "Priya Nair", allocations: "100" },
]);
const orchardAndLantern = projectsCsv([
  {
    name: "Orchard Grove",
    team: "Alex Turner, Maria Costa",
    allocations: "50, 50",
  },
  { name: "Lantern", team: "Priya Nair", allocations: "100" },
]);

type TestDb = ReturnType<typeof createTestDb>["db"];

async function persistedSnapshot(db: TestDb) {
  return {
    people: await db.select().from(people).orderBy(asc(people.employeeId)),
    projects: await db.select().from(projects).orderBy(asc(projects.name)),
    assignments: await db
      .select()
      .from(assignments)
      .orderBy(asc(assignments.personId), asc(assignments.projectId)),
    calendarEvents: await db
      .select()
      .from(calendarEvents)
      .orderBy(asc(calendarEvents.uid)),
    calendarOccurrences: await db
      .select()
      .from(calendarEventOccurrences)
      .orderBy(
        asc(calendarEventOccurrences.eventId),
        asc(calendarEventOccurrences.startDate),
      ),
  };
}

describe.skipIf(!testDatabaseUrl)("import snapshot reconciliation", () => {
  let client!: ReturnType<typeof createTestDb>["client"];
  let db!: ReturnType<typeof createTestDb>["db"];

  beforeAll(async () => {
    ({ client, db } = createTestDb());
    await resetStaffingTables(db);
  });

  beforeEach(async () => {
    await resetStaffingTables(db);
  });

  afterAll(async () => {
    await client.end();
  });

  it("removes people missing from the latest people CSV and keeps stable ids", async () => {
    await importStudioData(db, {
      peopleCsv: threePeople,
      projectsCsv: lanternOnly,
      calendarIcs: emptyHolidayCalendar,
    });

    const afterFirst = await db
      .select({
        id: people.id,
        employeeId: people.employeeId,
        firstName: people.firstName,
        lastName: people.lastName,
      })
      .from(people);

    const mariaId = afterFirst.find((row) => row.employeeId === "E003")?.id;
    const priyaId = afterFirst.find((row) => row.employeeId === "E005")?.id;

    expect(mariaId).toBeDefined();
    expect(priyaId).toBeDefined();
    expect(afterFirst.map((row) => row.employeeId).sort()).toEqual([
      "E002",
      "E003",
      "E005",
    ]);

    await importStudioData(db, {
      peopleCsv: twoPeople,
      projectsCsv: lanternOnly,
      calendarIcs: emptyHolidayCalendar,
    });

    const afterSecond = await db
      .select({
        id: people.id,
        employeeId: people.employeeId,
        firstName: people.firstName,
        lastName: people.lastName,
      })
      .from(people);

    expect(
      afterSecond.map((row) => `${row.firstName} ${row.lastName}`).sort(),
    ).toEqual(["Maria Costa", "Priya Nair"]);
    expect(afterSecond.find((row) => row.employeeId === "E003")?.id).toBe(
      mariaId,
    );
    expect(afterSecond.find((row) => row.employeeId === "E005")?.id).toBe(
      priyaId,
    );
  });

  it("removes projects missing from the latest projects CSV and their assignments", async () => {
    await importStudioData(db, {
      peopleCsv: threePeople,
      projectsCsv: orchardAndLantern,
      calendarIcs: emptyHolidayCalendar,
    });

    await importStudioData(db, {
      peopleCsv: threePeople,
      projectsCsv: projectsCsv([
        { name: "Lantern", team: "Priya Nair", allocations: "80" },
      ]),
      calendarIcs: emptyHolidayCalendar,
    });

    const projectRows = await db.select().from(projects);
    const assignmentRows = await db.select().from(assignments);

    expect(projectRows.map((row) => row.name)).toEqual(["Lantern"]);
    expect(assignmentRows).toHaveLength(1);
    expect(assignmentRows[0]?.allocationPercentage).toBe(80);

    const [lanternPerson] = await db
      .select({ firstName: people.firstName, lastName: people.lastName })
      .from(people)
      .innerJoin(assignments, eq(assignments.personId, people.id))
      .where(eq(assignments.id, assignmentRows[0]!.id));

    expect(`${lanternPerson.firstName} ${lanternPerson.lastName}`).toBe(
      "Priya Nair",
    );
  });

  it("reconciles remaining project assignments to the latest team snapshot", async () => {
    const orchardAlexMaria = projectsCsv([
      {
        name: "Orchard Grove",
        team: "Alex Turner, Maria Costa",
        allocations: "50, 50",
      },
    ]);
    const orchardMariaOnly = projectsCsv([
      {
        name: "Orchard Grove",
        team: "Maria Costa",
        allocations: "70",
      },
    ]);

    await importStudioData(db, {
      peopleCsv: threePeople,
      projectsCsv: orchardAlexMaria,
      calendarIcs: emptyHolidayCalendar,
    });

    await importStudioData(db, {
      peopleCsv: threePeople,
      projectsCsv: orchardMariaOnly,
      calendarIcs: emptyHolidayCalendar,
    });

    const assignmentRows = await db
      .select({
        firstName: people.firstName,
        lastName: people.lastName,
        allocationPercentage: assignments.allocationPercentage,
        projectName: projects.name,
      })
      .from(assignments)
      .innerJoin(people, eq(assignments.personId, people.id))
      .innerJoin(projects, eq(assignments.projectId, projects.id));

    expect(assignmentRows).toEqual([
      {
        firstName: "Maria",
        lastName: "Costa",
        allocationPercentage: 70,
        projectName: "Orchard Grove",
      },
    ]);
  });

  it("removes calendar events missing from the latest ICS and their occurrences", async () => {
    await importStudioData(db, {
      peopleCsv: twoPeople,
      projectsCsv: lanternOnly,
      calendarIcs: twoHolidayCalendar,
    });

    const firstEvents = await db.select().from(calendarEvents);
    const firstOccurrences = await db.select().from(calendarEventOccurrences);

    expect(firstEvents.map((row) => row.uid).sort()).toEqual([
      "UID-A",
      "UID-B",
    ]);
    expect(firstOccurrences).toHaveLength(2);

    await importStudioData(db, {
      peopleCsv: twoPeople,
      projectsCsv: lanternOnly,
      calendarIcs: emptyHolidayCalendar,
    });

    const secondEvents = await db.select().from(calendarEvents);
    const secondOccurrences = await db.select().from(calendarEventOccurrences);

    expect(secondEvents.map((row) => row.uid)).toEqual(["UID-B"]);
    expect(secondOccurrences).toHaveLength(1);
    expect(secondOccurrences[0]?.eventId).toBe(secondEvents[0]?.id);
  });

  it("replaces recurring occurrences when the same UID is imported with a shorter RRULE", async () => {
    await importStudioData(db, {
      peopleCsv: twoPeople,
      projectsCsv: lanternOnly,
      calendarIcs: readCalendarFixture("standup.ics"),
    });

    const first = await db.select().from(calendarEventOccurrences);
    expect(first).toHaveLength(11);

    await importStudioData(db, {
      peopleCsv: twoPeople,
      projectsCsv: lanternOnly,
      calendarIcs: readCalendarFixture("standup-six.ics"),
    });

    const events = await db.select().from(calendarEvents);
    const occurrences = await db.select().from(calendarEventOccurrences);

    expect(events).toHaveLength(1);
    expect(events[0]?.uid).toBe("standup-recurring@example.com");
    expect(occurrences).toHaveLength(6);
    expect(occurrences.every((row) => row.eventId === events[0]?.id)).toBe(
      true,
    );
  });

  it("exposes only the latest snapshot through getMonthlyCapacity", async () => {
    await importStudioData(db, {
      peopleCsv: threePeople,
      projectsCsv: orchardAndLantern,
      calendarIcs: twoHolidayCalendar,
    });

    await importStudioData(db, {
      peopleCsv: twoPeople,
      projectsCsv: lanternOnly,
      calendarIcs: emptyHolidayCalendar,
    });

    const board = await getMonthlyCapacity(db, "2026-08");

    expect(
      board.map((row) => `${row.person.firstName} ${row.person.lastName}`),
    ).toEqual(["Maria Costa", "Priya Nair"]);
    expect(
      board.find((row) => row.person.lastName === "Costa")?.projects,
    ).toEqual([]);
    expect(
      board.find((row) => row.person.lastName === "Nair")?.projects,
    ).toEqual([
      expect.objectContaining({
        name: "Lantern",
        allocationPercentage: 100,
      }),
    ]);
  });

  it("rolls back snapshot B when projects matching fails after people were written", async () => {
    await importStudioData(db, {
      peopleCsv: threePeople,
      projectsCsv: orchardAndLantern,
      calendarIcs: twoHolidayCalendar,
    });

    const snapshotA = await persistedSnapshot(db);

    await expect(
      importStudioData(db, {
        peopleCsv: twoPeople,
        projectsCsv: orchardAndLantern,
        calendarIcs: twoHolidayCalendar,
      }),
    ).rejects.toSatisfy((error: unknown) => {
      return (
        error instanceof StudioImportError &&
        Boolean(
          error.errors.projects?.some((message) => /Alex Turner/.test(message)),
        )
      );
    });

    expect(await persistedSnapshot(db)).toEqual(snapshotA);
  });
});
