import { MAX_IMPORT_FILE_BYTES } from "@/lib/import-limits";

export type ImportFileKind = "csv" | "ics";
export type ImportSource = "people" | "projects" | "calendar";

const kindBySource: Record<ImportSource, ImportFileKind> = {
  people: "csv",
  projects: "csv",
  calendar: "ics",
};

export function validateImportFile(
  file: File | null | undefined,
  source: ImportSource,
): string | undefined {
  const kind = kindBySource[source];

  if (!file) {
    return kind === "csv"
      ? "Please select a CSV file."
      : "Please select an ICS file.";
  }

  if (file.size === 0) {
    return "This file is empty.";
  }

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return "This file is larger than 5 MB.";
  }

  const name = file.name.toLowerCase();

  if (kind === "csv" && !name.endsWith(".csv")) {
    return "Please select a CSV file.";
  }

  if (kind === "ics" && !name.endsWith(".ics")) {
    return "Please select an ICS file.";
  }

  return undefined;
}

export function importFileFieldError(
  file: File | null,
  source: ImportSource,
): string | undefined {
  if (!file) {
    return undefined;
  }

  return validateImportFile(file, source);
}
