import { describe, expect, it } from "vitest";

import { readCalendarFixture } from "./calendar-test-helpers";
import { parseCalendar } from "./parse-calendar";

const standupMondays = [
  "2026-08-03",
  "2026-08-10",
  "2026-08-17",
  "2026-08-24",
  "2026-08-31",
  "2026-09-07",
  "2026-09-14",
  "2026-09-21",
  "2026-09-28",
  "2026-10-05",
  "2026-10-12",
];

describe("expandCalendarOccurrences", () => {
  it("materialises one occurrence for a non-recurring all-day event", () => {
    const [event] = parseCalendar(readCalendarFixture("all-day-leave.ics"));

    expect(event.occurrences).toEqual([
      {
        startDate: "2026-09-21",
        endDate: "2026-09-26",
        startAt: null,
        endAt: null,
      },
    ]);
  });

  it("expands Studio Standup with node-ical timezone and UNTIL semantics", () => {
    const [event] = parseCalendar(readCalendarFixture("standup.ics"));

    expect(event.isAllDay).toBe(false);
    expect(event.timeZone).toBe("Europe/London");
    expect(event.startAt?.toISOString()).toBe("2026-08-03T08:30:00.000Z");
    expect(event.endAt?.toISOString()).toBe("2026-08-03T09:00:00.000Z");
    expect(event.occurrences).toHaveLength(11);
    expect(event.occurrences.map((occurrence) => occurrence.startDate)).toEqual(
      standupMondays,
    );
    expect(event.occurrences.at(-1)?.startDate).toBe("2026-10-12");

    for (const occurrence of event.occurrences) {
      expect(occurrence.startAt).toBeInstanceOf(Date);
      expect(occurrence.endAt).toBeInstanceOf(Date);
      expect(
        (occurrence.endAt?.getTime() ?? 0) -
          (occurrence.startAt?.getTime() ?? 0),
      ).toBe(30 * 60 * 1000);
    }

    expect(event.occurrences[0]).toMatchObject({
      startDate: "2026-08-03",
      endDate: "2026-08-03",
    });
    expect(event.occurrences[0]?.startAt?.toISOString()).toBe(
      "2026-08-03T08:30:00.000Z",
    );
    expect(event.occurrences[0]?.endAt?.toISOString()).toBe(
      "2026-08-03T09:00:00.000Z",
    );
    expect(event.occurrences.at(-1)?.startAt?.toISOString()).toBe(
      "2026-10-12T08:30:00.000Z",
    );
    expect(event.occurrences.at(-1)?.endAt?.toISOString()).toBe(
      "2026-10-12T09:00:00.000Z",
    );
    expect(
      new Set(event.occurrences.map((occurrence) => occurrence.startDate)).size,
    ).toBe(11);
  });

  it("expands Studio Standup to six Mondays when UNTIL is 7 September", () => {
    const [event] = parseCalendar(readCalendarFixture("standup-six.ics"));

    expect(event.occurrences).toHaveLength(6);
    expect(event.occurrences.map((occurrence) => occurrence.startDate)).toEqual(
      standupMondays.slice(0, 6),
    );
  });

  it("expands a recurrence bounded only by COUNT", () => {
    const [event] = parseCalendar(readCalendarFixture("standup-count.ics"));

    expect(event.occurrences).toHaveLength(3);
    expect(event.occurrences.map((occurrence) => occurrence.startDate)).toEqual(
      standupMondays.slice(0, 3),
    );
  });
});
