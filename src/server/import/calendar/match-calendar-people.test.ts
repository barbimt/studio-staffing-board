import { describe, expect, it } from "vitest";

import { parsePeopleCsv } from "../people/parse-people-csv";
import { readPeopleFixture } from "../people/people-csv.test-helpers";
import { readCalendarFixture } from "./calendar-test-helpers";
import { matchCalendarPeople } from "./match-calendar-people";
import { parseCalendar } from "./parse-calendar";

describe("matchCalendarPeople", () => {
  it("matches leave attendees after email normalization", () => {
    const [event] = parseCalendar(
      readCalendarFixture("leave-email-uppercase.ics"),
    );
    const resolved = matchCalendarPeople(
      [event],
      [{ id: 9, workEmail: "user@example.com" }],
    );

    expect(resolved[0]?.personId).toBe(9);
  });

  it("fails clearly when a leave attendee cannot be matched", () => {
    const events = parseCalendar(readCalendarFixture("unmatched-leave.ics"));

    expect(() =>
      matchCalendarPeople(events, [
        { id: 2, workEmail: "alex.turner@example.com" },
      ]),
    ).toThrow(
      /Event "Annual Leave - Unknown Person" \(UID leave-unmatched@example.com\): attendee "nobody@example.com" could not be matched to a canonical person/,
    );
  });

  it("fails rather than guessing when the same work email matches multiple people", () => {
    const events = parseCalendar(readCalendarFixture("all-day-leave.ics"));

    expect(() =>
      matchCalendarPeople(events, [
        { id: 3, workEmail: "maria.costa@example.com" },
        { id: 30, workEmail: "maria.costa@example.com" },
      ]),
    ).toThrow(
      /Event "Annual Leave - Maria Costa" \(UID leave-0004@example.com\): attendee "maria.costa@example.com" matches multiple canonical people/,
    );
  });

  it("does not require a person for holidays, ceremonies, or unknown categories", () => {
    const events = [
      ...parseCalendar(readCalendarFixture("holiday-uk.ics")),
      ...parseCalendar(readCalendarFixture("ceremony.ics")),
      ...parseCalendar(readCalendarFixture("unknown-category.ics")),
    ];

    const resolved = matchCalendarPeople(events, []);

    expect(resolved.map((event) => event.personId)).toEqual([null, null, null]);
  });

  it("resolves a small calendar snapshot against canonical people emails", () => {
    const people = parsePeopleCsv(readPeopleFixture("matching-people.csv")).map(
      (person, index) => ({
        id: index + 1,
        workEmail: person.workEmail,
      }),
    );
    const events = parseCalendar(readCalendarFixture("matching-calendar.ics"));
    const resolved = matchCalendarPeople(events, people);
    const leave = resolved.filter((event) => event.category === "LEAVE");

    expect(resolved).toHaveLength(2);
    expect(leave).toHaveLength(1);
    expect(leave.every((event) => event.personId !== null)).toBe(true);
    expect(
      resolved
        .filter((event) => event.category !== "LEAVE")
        .every((event) => event.personId === null),
    ).toBe(true);
  });
});
