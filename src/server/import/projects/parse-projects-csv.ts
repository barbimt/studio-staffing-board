import { CsvError, parse } from "csv-parse/sync";

import {
  projectsCsvRowSchema,
  ProjectsImportError,
  type ImportedProject,
} from "./projects.schema";

export { ProjectsImportError, type ImportedProject };

function formatIssue(rowNumber: number, message: string): string {
  return `Row ${rowNumber}: ${message}`;
}

function collectDuplicateNameErrors(
  entries: { rowNumber: number; name: string }[],
): string[] {
  const rowsByName = new Map<string, number[]>();

  for (const entry of entries) {
    const rows = rowsByName.get(entry.name) ?? [];
    rows.push(entry.rowNumber);
    rowsByName.set(entry.name, rows);
  }

  const errors: string[] = [];

  for (const rows of rowsByName.values()) {
    if (rows.length < 2) {
      continue;
    }

    for (const rowNumber of rows) {
      errors.push(formatIssue(rowNumber, "Name is duplicated"));
    }
  }

  return errors;
}

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
        errors.push(formatIssue(rowNumber, issue.message));
      }
      continue;
    }

    projects.push({ rowNumber, project: result.data });
  }

  errors.push(
    ...collectDuplicateNameErrors(
      projects.map(({ rowNumber, project }) => ({
        rowNumber,
        name: project.name,
      })),
    ),
  );

  if (errors.length > 0) {
    throw new ProjectsImportError(errors);
  }

  return projects.map(({ project }) => project);
}
