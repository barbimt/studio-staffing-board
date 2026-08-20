import {
  hasStudioImportErrors,
  type StudioImportSourceErrors,
} from "@/lib/import-result";
import {
  importFieldIssueMessages,
  validateImportContents,
  validateImportFile,
} from "@/lib/validate-import-file";
import { getDb } from "@/server/db";
import {
  importStudioData,
  StudioImportError,
} from "@/server/import/import-studio-data";

function jsonError(errors: StudioImportSourceErrors, status: number) {
  return Response.json({ ok: false, errors }, { status });
}

function fileFromForm(
  formData: FormData,
  field: "people" | "projects" | "calendar",
): File | null {
  const value = formData.get(field);

  if (value instanceof File) {
    return value;
  }

  return null;
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

  const errors: StudioImportSourceErrors = {};
  const peopleError = validateImportFile(people, "people");
  const projectsError = validateImportFile(projects, "projects");
  const calendarError = validateImportFile(calendar, "calendar");

  if (peopleError) {
    errors.people = importFieldIssueMessages(peopleError);
  }

  if (projectsError) {
    errors.projects = importFieldIssueMessages(projectsError);
  }

  if (calendarError) {
    errors.calendar = importFieldIssueMessages(calendarError);
  }

  if (hasStudioImportErrors(errors) || !people || !projects || !calendar) {
    return jsonError(errors, 400);
  }

  const peopleCsv = await people.text();
  const projectsCsv = await projects.text();
  const calendarIcs = await calendar.text();

  const peopleContentError = validateImportContents(peopleCsv, "people");
  const projectsContentError = validateImportContents(projectsCsv, "projects");
  const calendarContentError = validateImportContents(calendarIcs, "calendar");

  if (peopleContentError) {
    errors.people = importFieldIssueMessages(peopleContentError);
  }

  if (projectsContentError) {
    errors.projects = importFieldIssueMessages(projectsContentError);
  }

  if (calendarContentError) {
    errors.calendar = importFieldIssueMessages(calendarContentError);
  }

  if (hasStudioImportErrors(errors)) {
    return jsonError(errors, 400);
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
