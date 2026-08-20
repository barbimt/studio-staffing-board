import { describe, expect, it } from "vitest";

import { regionForCategory } from "./calendar.schema";
import { readCalendarFixture } from "./calendar-test-helpers";
import { parseCalendar } from "./parse-calendar";

describe("parseCalendar", () => {
  it("preserves all-day exclusive DTEND date strings", () => {
    const [event] = parseCalendar(readCalendarFixture("all-day-leave.ics"));

    expect(event).toMatchObject({
      uid: "leave-0004@example.com",
      summary: "Annual Leave - Maria Costa",
      category: "LEAVE",
      status: "CONFIRMED",
      attendeeEmail: "maria.costa@example.com",
      appliesToRegion: null,
      isAllDay: true,
      startDate: "2026-09-21",
      endDate: "2026-09-26",
      startAt: null,
      endAt: null,
      timeZone: null,
      rrule: null,
    });
  });

  it("normalizes attendee email by trimming and lowercasing", () => {
    const [event] = parseCalendar(
      readCalendarFixture("leave-email-uppercase.ics"),
    );

    expect(event.attendeeEmail).toBe("user@example.com");
  });

  it("allows a missing STATUS", () => {
    const [event] = parseCalendar(readCalendarFixture("missing-status.ics"));

    expect(event.status).toBeNull();
    expect(event.uid).toBe("leave-no-status@example.com");
  });

  it("fails when a LEAVE event has multiple attendee emails", () => {
    expect(() =>
      parseCalendar(readCalendarFixture("multiple-attendees-leave.ics")),
    ).toThrow(
      /Event "Annual Leave - Shared" \(UID leave-multi@example.com\): LEAVE events must have exactly one attendee email/,
    );
  });

  it("maps holiday categories to regions in one place", () => {
    expect(regionForCategory("HOLIDAY-UK")).toBe("UK");
    expect(regionForCategory("HOLIDAY-PT")).toBe("PT");
    expect(regionForCategory("TRAINING")).toBeNull();

    const [uk] = parseCalendar(readCalendarFixture("holiday-uk.ics"));
    const [pt] = parseCalendar(readCalendarFixture("holiday-pt.ics"));

    expect(uk).toMatchObject({
      category: "HOLIDAY-UK",
      attendeeEmail: null,
      appliesToRegion: "UK",
      isAllDay: true,
      startDate: "2026-08-31",
      endDate: "2026-09-01",
    });
    expect(pt).toMatchObject({
      category: "HOLIDAY-PT",
      attendeeEmail: null,
      appliesToRegion: "PT",
    });
  });

  it("keeps ceremony events global", () => {
    const [event] = parseCalendar(readCalendarFixture("ceremony.ics"));

    expect(event).toMatchObject({
      category: "CEREMONY",
      attendeeEmail: null,
      appliesToRegion: null,
      isAllDay: true,
      startDate: "2026-09-16",
      endDate: "2026-09-18",
    });
  });

  it("preserves unknown categories without inferring person or region", () => {
    const [event] = parseCalendar(readCalendarFixture("unknown-category.ics"));

    expect(event).toMatchObject({
      category: "TRAINING",
      attendeeEmail: null,
      appliesToRegion: null,
    });
  });

  it("fails unbounded RRULEs that have neither UNTIL nor COUNT", () => {
    expect(() =>
      parseCalendar(readCalendarFixture("unbounded-rrule.ics")),
    ).toThrow(
      /RRULE must include UNTIL or COUNT; unbounded recurrence is not imported/,
    );
  });

  it("fails when EXDATE is present", () => {
    expect(() => parseCalendar(readCalendarFixture("exdate.ics"))).toThrow(
      /EXDATE and RECURRENCE-ID are not supported/,
    );
  });

  it("parses a small calendar snapshot with leave and a holiday", () => {
    const events = parseCalendar(readCalendarFixture("matching-calendar.ics"));

    expect(events).toHaveLength(2);
    expect(events.filter((event) => event.category === "LEAVE")).toHaveLength(
      1,
    );
    expect(
      events
        .filter((event) => event.category === "LEAVE")
        .every((event) => Boolean(event.attendeeEmail)),
    ).toBe(true);
  });
});
