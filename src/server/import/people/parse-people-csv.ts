import { CsvError, parse } from "csv-parse/sync";

import {
  peopleCsvRowSchema,
  PeopleImportError,
  type Person,
} from "./people.schema";

export { PeopleImportError, type Person };

function formatIssue(rowNumber: number, message: string): string {
  return `Row ${rowNumber}: ${message}`;
}

function collectDuplicateErrors(
  entries: { rowNumber: number; value: string }[],
  field: string,
): string[] {
  const rowsByValue = new Map<string, number[]>();

  for (const entry of entries) {
    const rows = rowsByValue.get(entry.value) ?? [];
    rows.push(entry.rowNumber);
    rowsByValue.set(entry.value, rows);
  }

  const errors: string[] = [];

  for (const rows of rowsByValue.values()) {
    if (rows.length < 2) {
      continue;
    }

    for (const rowNumber of rows) {
      errors.push(formatIssue(rowNumber, `${field} is duplicated`));
    }
  }

  return errors;
}

export function parsePeopleCsv(csvText: string): Person[] {
  let records: Record<string, string>[];

  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });
  } catch (error) {
    if (error instanceof CsvError) {
      throw new PeopleImportError("CSV is invalid");
    }

    throw error;
  }

  const errors: string[] = [];
  const people: { rowNumber: number; person: Person }[] = [];

  for (const [index, record] of records.entries()) {
    const rowNumber = index + 2;
    const result = peopleCsvRowSchema.safeParse(record);

    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(formatIssue(rowNumber, issue.message));
      }
      continue;
    }

    people.push({ rowNumber, person: result.data });
  }

  errors.push(
    ...collectDuplicateErrors(
      people.map(({ rowNumber, person }) => ({
        rowNumber,
        value: person.employeeId,
      })),
      "Employee ID",
    ),
    ...collectDuplicateErrors(
      people.map(({ rowNumber, person }) => ({
        rowNumber,
        value: person.workEmail,
      })),
      "Work Email",
    ),
  );

  if (errors.length > 0) {
    throw new PeopleImportError(errors);
  }

  return people.map(({ person }) => person);
}
