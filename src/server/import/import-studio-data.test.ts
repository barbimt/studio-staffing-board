import { beforeEach, describe, expect, it, vi } from "vitest";

import { importStudioData, StudioImportError } from "./import-studio-data";
import { importCalendar } from "./calendar/import-calendar";
import { importPeople } from "./people/import-people";
import { readPeopleFixture } from "./people/people-csv.test-helpers";
import { importProjects } from "./projects/import-projects";
import { readProjectsFixture } from "./projects/projects-csv.test-helpers";
import { readCalendarFixture } from "./calendar/calendar-test-helpers";
import type { AppDatabase } from "../db/client";

vi.mock("./people/import-people", () => ({
  importPeople: vi.fn(),
}));

vi.mock("./projects/import-projects", () => ({
  importProjects: vi.fn(),
}));

vi.mock("./calendar/import-calendar", () => ({
  importCalendar: vi.fn(),
}));

const tx = { kind: "tx" };
const database = {
  transaction: vi.fn(async (callback: (value: unknown) => Promise<void>) =>
    callback(tx),
  ),
} as unknown as AppDatabase;

const validSources = {
  peopleCsv: readPeopleFixture("matching-people.csv"),
  projectsCsv: readProjectsFixture("valid-project.csv"),
  calendarIcs: readCalendarFixture("matching-calendar.ics"),
};

describe("importStudioData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not persist when a people file fails to parse", async () => {
    await expect(
      importStudioData(database, {
        ...validSources,
        peopleCsv: readPeopleFixture("invalid-email.csv"),
      }),
    ).rejects.toSatisfy((error: unknown) => {
      return (
        error instanceof StudioImportError &&
        Boolean(
          error.errors.people?.some((message) => /Work Email/.test(message)),
        )
      );
    });

    expect(database.transaction).not.toHaveBeenCalled();
    expect(importPeople).not.toHaveBeenCalled();
  });

  it("collects parse errors from multiple sources before any writes", async () => {
    await expect(
      importStudioData(database, {
        peopleCsv: readPeopleFixture("invalid-email.csv"),
        projectsCsv: readProjectsFixture("mismatched-lists.csv"),
        calendarIcs: readCalendarFixture("unbounded-rrule.ics"),
      }),
    ).rejects.toSatisfy((error: unknown) => {
      return (
        error instanceof StudioImportError &&
        Boolean(error.errors.people?.length) &&
        Boolean(error.errors.projects?.length) &&
        Boolean(error.errors.calendar?.length)
      );
    });

    expect(database.transaction).not.toHaveBeenCalled();
  });

  it("persists inside one transaction after all files parse", async () => {
    await importStudioData(database, validSources);

    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(importPeople).toHaveBeenCalledWith(tx, expect.any(Array));
    expect(importProjects).toHaveBeenCalledWith(tx, expect.any(Array));
    expect(importCalendar).toHaveBeenCalledWith(tx, expect.any(Array));
  });
});
