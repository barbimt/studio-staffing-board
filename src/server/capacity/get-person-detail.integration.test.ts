import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { getPersonDetail } from "@/server/capacity/get-person-detail";
import { updateAssignmentAllocation } from "@/server/capacity/update-assignment-allocation";
import { assignments, people } from "@/server/db/schema";
import { importStudioData } from "@/server/import/import-studio-data";
import {
  createTestDb,
  resetStaffingTables,
  testDatabaseUrl,
} from "@/test/integration-db";

const peopleCsv = [
  "Employee ID,First Name,Last Name,Work Email,Department,Job Title,Site,FTE,Start Date,End Date,Manager Email",
  "E003,Maria,Costa,maria.costa@example.com,Art,Senior Artist,Porto,0.80,2022-01-01,,",
  "E002,Alex,Turner,alex.turner@example.com,Engineering,Lead Developer,Bristol,1.00,2022-01-01,,",
].join("\n");

const projectsCsv = [
  "Name,Status,Client,Platform,Start,End,Team,Allocation %",
  "North Star,Active,Studio internal,PC,2026-01-12,2026-04-24,Maria Costa,56",
  "Open House,Active,Open House,PC,2026-09-07,2026-12-18,Maria Costa,70",
  "Lantern,Active,Bluebird,PC,2026-05-04,2026-12-18,Alex Turner,40",
].join("\n");

function calendarIcs(...events: string[]) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Example Studio//Calendar Export//EN",
    ...events,
    "END:VCALENDAR",
  ].join("\n");
}

const mariaLeave = [
  "BEGIN:VEVENT",
  "UID:leave-maria-sep@example.com",
  "SUMMARY:Annual Leave - Maria Costa",
  "DTSTART;VALUE=DATE:20260921",
  "DTEND;VALUE=DATE:20260925",
  "ATTENDEE;CN=Maria Costa:mailto:maria.costa@example.com",
  "CATEGORIES:LEAVE",
  "STATUS:CONFIRMED",
  "END:VEVENT",
].join("\n");

const ptHolidaySeptember = [
  "BEGIN:VEVENT",
  "UID:hol-pt-sep@example.com",
  "SUMMARY:Portugal holiday",
  "DTSTART;VALUE=DATE:20260907",
  "DTEND;VALUE=DATE:20260908",
  "CATEGORIES:HOLIDAY-PT",
  "STATUS:CONFIRMED",
  "END:VEVENT",
].join("\n");

const ukHolidaySeptember = [
  "BEGIN:VEVENT",
  "UID:hol-uk-sep@example.com",
  "SUMMARY:UK holiday",
  "DTSTART;VALUE=DATE:20260908",
  "DTEND;VALUE=DATE:20260909",
  "CATEGORIES:HOLIDAY-UK",
  "STATUS:CONFIRMED",
  "END:VEVENT",
].join("\n");

const standupCeremony = [
  "BEGIN:VEVENT",
  "UID:standup-recurring@example.com",
  "SUMMARY:Studio Standup",
  "DTSTART;TZID=Europe/London:20260803T093000",
  "DTEND;TZID=Europe/London:20260803T100000",
  "RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20260907T235900Z",
  "CATEGORIES:CEREMONY",
  "STATUS:CONFIRMED",
  "END:VEVENT",
].join("\n");

describe.skipIf(!testDatabaseUrl)("getPersonDetail", () => {
  let client!: ReturnType<typeof createTestDb>["client"];
  let db!: ReturnType<typeof createTestDb>["db"];

  beforeAll(async () => {
    ({ client, db } = createTestDb());
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(async () => {
    await resetStaffingTables(db);
  });

  it("loads one person with leave/holiday split, year projects, and no ceremonies", async () => {
    await importStudioData(db, {
      peopleCsv,
      projectsCsv,
      calendarIcs: calendarIcs(
        mariaLeave,
        ptHolidaySeptember,
        ukHolidaySeptember,
        standupCeremony,
      ),
    });

    const [maria] = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.employeeId, "E003"));

    const detail = await getPersonDetail(db, maria!.id, "2026-09");

    expect(detail?.person.firstName).toBe("Maria");
    expect(detail?.person.department).toBe("Art");
    expect(detail?.holidayRegion).toBe("PT");
    expect(detail?.month.contractualCapacityPercentage).toBe(80);
    expect(detail?.month.leaveWeekdays).toBe(4);
    expect(detail?.month.holidayWeekdays).toBe(1);
    expect(detail?.month.unavailableWeekdays).toBe(5);
    expect(detail?.month.effectiveCapacityPercentage).toBe(61.82);
    expect(detail?.month.totalAllocationPercentage).toBe(70);
    expect(detail?.month.status).toBe("overcommitted");
    expect(detail?.assignments.map((row) => row.name).sort()).toEqual([
      "North Star",
      "Open House",
    ]);
    expect(
      detail?.assignments.find((row) => row.name === "Open House")
        ?.activeInSelectedMonth,
    ).toBe(true);
    expect(
      detail?.assignments.find((row) => row.name === "North Star")
        ?.activeInSelectedMonth,
    ).toBe(false);
    expect(detail?.timeOff.leave).toEqual([
      expect.objectContaining({
        label: "Annual Leave",
        startDate: "2026-09-21",
        endDate: "2026-09-25",
      }),
    ]);
    expect(detail?.timeOff.holidays).toEqual([
      expect.objectContaining({
        label: "Portugal holiday",
        date: "2026-09-07",
      }),
    ]);
    expect(
      detail?.timeOff.holidays.some((row) => row.label === "UK holiday"),
    ).toBe(false);
    expect(JSON.stringify(detail?.timeOff).includes("Standup")).toBe(false);
  });

  it("returns null for an unknown person", async () => {
    await importStudioData(db, {
      peopleCsv,
      projectsCsv,
      calendarIcs: calendarIcs(mariaLeave),
    });

    expect(await getPersonDetail(db, 999_999, "2026-09")).toBeNull();
  });

  it("updates allocation without deleting a 0% assignment", async () => {
    await importStudioData(db, {
      peopleCsv,
      projectsCsv,
      calendarIcs: calendarIcs(mariaLeave, ptHolidaySeptember),
    });

    const [maria] = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.employeeId, "E003"));
    const before = await getPersonDetail(db, maria!.id, "2026-09");
    const openHouse = before!.assignments.find(
      (row) => row.name === "Open House",
    )!;

    await updateAssignmentAllocation(db, {
      assignmentId: openHouse.assignmentId,
      personId: maria!.id,
      month: "2026-09",
      allocationPercentage: 140,
    });

    const over = await getPersonDetail(db, maria!.id, "2026-09");
    expect(
      over?.assignments.find((row) => row.name === "Open House")
        ?.allocationPercentage,
    ).toBe(140);
    expect(over?.month.totalAllocationPercentage).toBe(140);
    expect(over?.month.status).toBe("overcommitted");

    await updateAssignmentAllocation(db, {
      assignmentId: openHouse.assignmentId,
      personId: maria!.id,
      month: "2026-09",
      allocationPercentage: 0,
    });

    const zero = await getPersonDetail(db, maria!.id, "2026-09");
    expect(
      zero?.assignments.find((row) => row.name === "Open House")
        ?.allocationPercentage,
    ).toBe(0);
    const [row] = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, openHouse.assignmentId));
    expect(row).toBeDefined();
  });

  it("rejects allocation edits when the project ended before the month", async () => {
    await importStudioData(db, {
      peopleCsv,
      projectsCsv,
      calendarIcs: calendarIcs(mariaLeave),
    });

    const [maria] = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.employeeId, "E003"));
    const detail = await getPersonDetail(db, maria!.id, "2026-09");
    const northStar = detail!.assignments.find(
      (row) => row.name === "North Star",
    )!;

    await expect(
      updateAssignmentAllocation(db, {
        assignmentId: northStar.assignmentId,
        personId: maria!.id,
        month: "2026-09",
        allocationPercentage: 10,
      }),
    ).rejects.toThrow(/already ended/i);

    const after = await getPersonDetail(db, maria!.id, "2026-09");
    expect(
      after?.assignments.find((row) => row.name === "North Star")
        ?.allocationPercentage,
    ).toBe(56);
  });
});
