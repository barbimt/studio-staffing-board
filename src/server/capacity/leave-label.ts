export function leaveLabelFromSummary(
  summary: string,
  person: { firstName: string; lastName: string },
): string {
  const suffix = ` - ${person.firstName} ${person.lastName}`;

  if (
    summary.length > suffix.length &&
    summary.slice(-suffix.length).toLowerCase() === suffix.toLowerCase()
  ) {
    return summary.slice(0, -suffix.length).trimEnd();
  }

  return summary;
}
