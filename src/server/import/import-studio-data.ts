import "server-only";

import { type AppDatabase } from "../db/client";
import { CalendarImportError } from "./calendar/calendar.schema";
import { importCalendar } from "./calendar/import-calendar";
import { parseCalendar } from "./calendar/parse-calendar";
import { importPeople } from "./people/import-people";
import { parsePeopleCsv } from "./people/parse-people-csv";
import { PeopleImportError } from "./people/people.schema";
import { importProjects } from "./projects/import-projects";
import { parseProjectsCsv } from "./projects/parse-projects-csv";
import { ProjectsImportError } from "./projects/projects.schema";
import {
  hasStudioImportErrors,
  type StudioImportSourceErrors,
} from "@/lib/import-result";

export class StudioImportError extends Error {
  readonly errors: StudioImportSourceErrors;

  constructor(errors: StudioImportSourceErrors) {
    super("Studio import failed");
    this.name = "StudioImportError";
    this.errors = errors;
  }
}

function messagesFrom(error: unknown): string[] | undefined {
  if (
    error instanceof PeopleImportError ||
    error instanceof ProjectsImportError ||
    error instanceof CalendarImportError
  ) {
    return error.messages;
  }

  return undefined;
}

export async function importStudioData(
  database: AppDatabase,
  sources: {
    peopleCsv: string;
    projectsCsv: string;
    calendarIcs: string;
  },
): Promise<void> {
  const errors: StudioImportSourceErrors = {};
  let peopleRecords;
  let projectRecords;
  let calendarRecords;

  try {
    peopleRecords = parsePeopleCsv(sources.peopleCsv);
  } catch (error) {
    errors.people = messagesFrom(error) ?? ["People file is invalid"];
  }

  try {
    projectRecords = parseProjectsCsv(sources.projectsCsv);
  } catch (error) {
    errors.projects = messagesFrom(error) ?? ["Projects file is invalid"];
  }

  try {
    calendarRecords = parseCalendar(sources.calendarIcs);
  } catch (error) {
    errors.calendar = messagesFrom(error) ?? ["Leave calendar file is invalid"];
  }

  if (
    hasStudioImportErrors(errors) ||
    !peopleRecords ||
    !projectRecords ||
    !calendarRecords
  ) {
    throw new StudioImportError(errors);
  }

  try {
    await database.transaction(async (tx) => {
      await importPeople(tx, peopleRecords);
      await importProjects(tx, projectRecords);
      await importCalendar(tx, calendarRecords);
    });
  } catch (error) {
    if (error instanceof PeopleImportError) {
      throw new StudioImportError({ people: error.messages });
    }

    if (error instanceof ProjectsImportError) {
      throw new StudioImportError({ projects: error.messages });
    }

    if (error instanceof CalendarImportError) {
      throw new StudioImportError({ calendar: error.messages });
    }

    throw error;
  }
}
