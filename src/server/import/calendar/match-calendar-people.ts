import {
  CalendarImportError,
  LEAVE_CATEGORY,
  normalizeEmail,
  type ImportedCalendarEvent,
  type ResolvedCalendarEvent,
} from "./calendar.schema";

export type CanonicalPerson = {
  id: number;
  workEmail: string;
};

function peopleByWorkEmail(
  people: CanonicalPerson[],
): Map<string, CanonicalPerson[]> {
  const lookup = new Map<string, CanonicalPerson[]>();

  for (const person of people) {
    const key = normalizeEmail(person.workEmail);
    const matches = lookup.get(key) ?? [];
    matches.push(person);
    lookup.set(key, matches);
  }

  return lookup;
}

export function matchCalendarPeople(
  events: ImportedCalendarEvent[],
  people: CanonicalPerson[],
): ResolvedCalendarEvent[] {
  const lookup = peopleByWorkEmail(people);
  const errors: string[] = [];
  const resolved: ResolvedCalendarEvent[] = [];

  for (const event of events) {
    if (event.category !== LEAVE_CATEGORY) {
      resolved.push({
        ...event,
        personId: null,
      });
      continue;
    }

    const attendeeEmail = event.attendeeEmail;

    if (!attendeeEmail) {
      errors.push(
        `Event "${event.summary}" (UID ${event.uid}): attendee email is missing`,
      );
      continue;
    }

    const matches = lookup.get(attendeeEmail) ?? [];

    if (matches.length === 0) {
      errors.push(
        `Event "${event.summary}" (UID ${event.uid}): attendee "${attendeeEmail}" could not be matched to a canonical person`,
      );
      continue;
    }

    if (matches.length > 1) {
      errors.push(
        `Event "${event.summary}" (UID ${event.uid}): attendee "${attendeeEmail}" matches multiple canonical people`,
      );
      continue;
    }

    const [person] = matches;
    resolved.push({
      ...event,
      personId: person.id,
    });
  }

  if (errors.length > 0) {
    throw new CalendarImportError(errors);
  }

  return resolved;
}
