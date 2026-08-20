import { MAX_IMPORT_FILE_BYTES } from "@/lib/import-limits";

type ImportFileKind = "csv" | "ics";
export type ImportSource = "people" | "projects" | "calendar";

const kindBySource: Record<ImportSource, ImportFileKind> = {
  people: "csv",
  projects: "csv",
  calendar: "ics",
};

export const peopleRequiredCsvLabels = [
  "Employee ID",
  "First Name",
  "Last Name",
  "Work Email",
  "Department",
  "Job Title",
  "Site",
  "FTE",
  "Start Date",
] as const;

export const projectsRequiredCsvLabels = [
  "Name",
  "Status",
  "Client",
  "Platform",
  "Start",
  "End",
  "Team",
  "Allocation %",
] as const;

function columnsFromLabels(labels: readonly string[]) {
  return labels.map((label) => ({
    key: label.toLowerCase(),
    label,
  }));
}

export const MAX_VISIBLE_IMPORT_ERRORS = 8;

export function visibleImportErrors(messages: string[]): {
  shown: string[];
  remaining: number;
} {
  return {
    shown: messages.slice(0, MAX_VISIBLE_IMPORT_ERRORS),
    remaining: Math.max(0, messages.length - MAX_VISIBLE_IMPORT_ERRORS),
  };
}

function firstLine(text: string): string {
  return (
    text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .find((line) => line.trim().length > 0) ?? ""
  );
}

function csvHeaderParts(header: string): string[] {
  return header
    .split(",")
    .map((part) => part.trim().replace(/^"|"$/g, "").toLowerCase());
}

export type ImportFieldIssue = {
  message: string;
  details?: string[];
};

function fileIssue(message: string, details?: string[]): ImportFieldIssue {
  return details?.length ? { message, details } : { message };
}

export function importFieldIssueMessages(issue: ImportFieldIssue): string[] {
  return issue.details?.length
    ? [issue.message, ...issue.details]
    : [issue.message];
}

function missingCsvColumns(
  header: string,
  columns: readonly { key: string; label: string }[],
): string[] {
  const parts = csvHeaderParts(header);

  return columns
    .filter((column) => !parts.includes(column.key))
    .map((column) => column.label);
}

export function validateImportContents(
  text: string,
  source: ImportSource,
): ImportFieldIssue | undefined {
  if (source === "calendar") {
    if (/BEGIN:VCALENDAR/i.test(text)) {
      return undefined;
    }

    return fileIssue("This file should contain BEGIN:VCALENDAR.");
  }

  const missing = missingCsvColumns(
    firstLine(text),
    source === "people"
      ? columnsFromLabels(peopleRequiredCsvLabels)
      : columnsFromLabels(projectsRequiredCsvLabels),
  );

  if (missing.length === 0) {
    return undefined;
  }

  const kind = source === "people" ? "people" : "projects";

  return fileIssue(`This ${kind} CSV is missing:`, missing);
}

export function validateImportFile(
  file: File | null | undefined,
  source: ImportSource,
): ImportFieldIssue | undefined {
  const kind = kindBySource[source];

  if (!file) {
    return fileIssue(
      kind === "csv"
        ? "Please select a CSV file."
        : "Please select an ICS file.",
    );
  }

  if (file.size === 0) {
    return fileIssue("This file is empty.");
  }

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return fileIssue("This file is larger than 5 MB.");
  }

  const name = file.name.toLowerCase();

  if (kind === "csv" && !name.endsWith(".csv")) {
    return fileIssue("Please select a CSV file.");
  }

  if (kind === "ics" && !name.endsWith(".ics")) {
    return fileIssue("Please select an ICS file.");
  }

  return undefined;
}

export function importFileFieldError(
  file: File | null,
  source: ImportSource,
): ImportFieldIssue | undefined {
  if (!file) {
    return undefined;
  }

  return validateImportFile(file, source);
}

export async function validateSelectedImportFile(
  file: File | null,
  source: ImportSource,
): Promise<ImportFieldIssue | undefined> {
  const metaError = importFileFieldError(file, source);

  if (metaError || !file) {
    return metaError;
  }

  return validateImportContents(await file.text(), source);
}
