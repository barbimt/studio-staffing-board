export function formatCsvRowIssue(rowNumber: number, message: string): string {
  return `Row ${rowNumber}: ${message}`;
}

export function collectDuplicateErrors(
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
      errors.push(formatCsvRowIssue(rowNumber, `${field} is duplicated`));
    }
  }

  return errors;
}
