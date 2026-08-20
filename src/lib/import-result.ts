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
