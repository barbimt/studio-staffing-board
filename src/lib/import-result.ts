export type StudioImportSourceErrors = {
  people?: string[];
  projects?: string[];
  calendar?: string[];
};

export type StudioImportResult =
  { ok: true } | { ok: false; errors: StudioImportSourceErrors };

export function hasStudioImportErrors(
  errors: StudioImportSourceErrors,
): boolean {
  return Boolean(
    errors.people?.length || errors.projects?.length || errors.calendar?.length,
  );
}

export function parseStudioImportResult(
  value: unknown,
): StudioImportResult | undefined {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    return undefined;
  }

  if (value.ok === true) {
    return { ok: true };
  }

  if (
    value.ok !== false ||
    !("errors" in value) ||
    typeof value.errors !== "object"
  ) {
    return undefined;
  }

  const errors = value.errors as StudioImportSourceErrors | null;

  if (errors === null) {
    return undefined;
  }

  return { ok: false, errors };
}
