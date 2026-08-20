import { CsvError, parse } from "csv-parse/sync";

import {
  collectDuplicateErrors,
  formatCsvRowIssue,
} from "../csv-duplicate-errors";
import {
  peopleCsvRowSchema,
  PeopleImportError,
  type Person,
} from "./people.schema";

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
        errors.push(formatCsvRowIssue(rowNumber, issue.message));
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
