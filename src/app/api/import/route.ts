import {
  hasStudioImportErrors,
  type StudioImportSourceErrors,
} from "@/lib/import-result";
import {
  importFieldIssueMessages,
  type ImportFieldIssue,
  type ImportSource,
  validateImportContents,
  validateImportFile,
} from "@/lib/validate-import-file";
import { getDb } from "@/server/db";
import {
  importStudioData,
  StudioImportError,
} from "@/server/import/import-studio-data";

const importSources = ["people", "projects", "calendar"] as const;

function jsonError(errors: StudioImportSourceErrors, status: number) {
  return Response.json({ ok: false, errors }, { status });
}

function fileFromForm(formData: FormData, field: ImportSource): File | null {
  const value = formData.get(field);

  if (value instanceof File) {
    return value;
  }

  return null;
}

function collectImportErrors<T>(
  values: Record<ImportSource, T>,
  validate: (value: T, source: ImportSource) => ImportFieldIssue | undefined,
): StudioImportSourceErrors {
  const errors: StudioImportSourceErrors = {};

  for (const source of importSources) {
    const issue = validate(values[source], source);

    if (issue) {
      errors[source] = importFieldIssueMessages(issue);
    }
  }

  return errors;
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError({}, 400);
  }

  const people = fileFromForm(formData, "people");
  const projects = fileFromForm(formData, "projects");
  const calendar = fileFromForm(formData, "calendar");

  const fileErrors = collectImportErrors(
    { people, projects, calendar },
    validateImportFile,
  );

  if (hasStudioImportErrors(fileErrors) || !people || !projects || !calendar) {
    return jsonError(fileErrors, 400);
  }

  const [peopleCsv, projectsCsv, calendarIcs] = await Promise.all([
    people.text(),
    projects.text(),
    calendar.text(),
  ]);

  const contentErrors = collectImportErrors(
    {
      people: peopleCsv,
      projects: projectsCsv,
      calendar: calendarIcs,
    },
    validateImportContents,
  );

  if (hasStudioImportErrors(contentErrors)) {
    return jsonError(contentErrors, 400);
  }

  try {
    await importStudioData(getDb(), {
      peopleCsv,
      projectsCsv,
      calendarIcs,
    });
  } catch (error) {
    if (error instanceof StudioImportError) {
      return jsonError(error.errors, 400);
    }

    return jsonError({}, 500);
  }

  return Response.json({ ok: true });
}
