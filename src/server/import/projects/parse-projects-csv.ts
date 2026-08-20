import { CsvError, parse } from "csv-parse/sync";

import {
  collectDuplicateErrors,
  formatCsvRowIssue,
} from "../csv-duplicate-errors";
import {
  projectsCsvRowSchema,
  ProjectsImportError,
  type ImportedProject,
} from "./projects.schema";

export function parseProjectsCsv(csvText: string): ImportedProject[] {
  let records: Record<string, string>[];

  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });
  } catch (error) {
    if (error instanceof CsvError) {
      throw new ProjectsImportError("CSV is invalid");
    }

    throw error;
  }

  const errors: string[] = [];
  const projects: { rowNumber: number; project: ImportedProject }[] = [];

  for (const [index, record] of records.entries()) {
    const rowNumber = index + 2;
    const result = projectsCsvRowSchema.safeParse(record);

    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(formatCsvRowIssue(rowNumber, issue.message));
      }
      continue;
    }

    projects.push({ rowNumber, project: result.data });
  }

  errors.push(
    ...collectDuplicateErrors(
      projects.map(({ rowNumber, project }) => ({
        rowNumber,
        value: project.name,
      })),
      "Name",
    ),
  );

  if (errors.length > 0) {
    throw new ProjectsImportError(errors);
  }

  return projects.map(({ project }) => project);
}
