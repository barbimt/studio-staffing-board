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

type SourceKey = keyof StudioImportSourceErrors;

function sourceFrom(
  error: unknown,
): { key: SourceKey; messages: string[] } | undefined {
  if (error instanceof PeopleImportError) {
    return { key: "people", messages: error.messages };
  }

  if (error instanceof ProjectsImportError) {
    return { key: "projects", messages: error.messages };
  }

  if (error instanceof CalendarImportError) {
    return { key: "calendar", messages: error.messages };
  }

  return undefined;
}

function tryParse<T>(
  errors: StudioImportSourceErrors,
  key: SourceKey,
  fallback: string,
  parse: () => T,
): T | undefined {
  try {
    return parse();
  } catch (error) {
    errors[key] = sourceFrom(error)?.messages ?? [fallback];
    return undefined;
  }
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

  const peopleRecords = tryParse(
    errors,
    "people",
    "People file is invalid",
    () => parsePeopleCsv(sources.peopleCsv),
  );
  const projectRecords = tryParse(
    errors,
    "projects",
    "Projects file is invalid",
    () => parseProjectsCsv(sources.projectsCsv),
  );
  const calendarRecords = tryParse(
    errors,
    "calendar",
    "Leave calendar file is invalid",
    () => parseCalendar(sources.calendarIcs),
  );

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
    const source = sourceFrom(error);
    if (source) {
      throw new StudioImportError({ [source.key]: source.messages });
    }

    throw error;
  }
}
