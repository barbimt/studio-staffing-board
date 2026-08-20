import { describe, expect, it } from "vitest";

import { allDayCalendarDate } from "./calendar-dates";

describe("allDayCalendarDate", () => {
  it("formats the local calendar day node-ical stores for VALUE=DATE", () => {
    expect(allDayCalendarDate(new Date(2026, 8, 21))).toBe("2026-09-21");
  });
});
