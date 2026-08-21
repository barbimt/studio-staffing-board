import { describe, expect, it } from "vitest";

import {
  addUtcDays,
  clipExclusiveRangeToMonth,
  formatInclusiveDateRange,
  inclusiveDayCount,
} from "./format-staffing-dates";

const september = { monthStart: "2026-09-01", monthEnd: "2026-09-30" };

describe("formatInclusiveDateRange", () => {
  it("formats inclusive project dates", () => {
    expect(formatInclusiveDateRange("2026-01-12", "2026-04-24")).toBe(
      "12 Jan – 24 Apr",
    );
  });

  it("uses the day before an exclusive ICS end date", () => {
    expect(
      formatInclusiveDateRange("2026-08-19", "2026-08-24", {
        exclusiveEnd: true,
      }),
    ).toBe("19 Aug – 23 Aug");
  });
});

describe("inclusiveDayCount", () => {
  it("counts inclusive calendar days for exclusive ICS ranges", () => {
    expect(
      inclusiveDayCount("2026-08-14", "2026-08-22", { exclusiveEnd: true }),
    ).toBe(8);
  });

  it("counts a single-day exclusive range as one day", () => {
    expect(
      inclusiveDayCount("2026-08-14", "2026-08-15", { exclusiveEnd: true }),
    ).toBe(1);
  });
});

describe("addUtcDays", () => {
  it("crosses month boundaries", () => {
    expect(addUtcDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addUtcDays("2026-09-01", -1)).toBe("2026-08-31");
  });
});

describe("clipExclusiveRangeToMonth", () => {
  it("keeps a range already inside the month", () => {
    expect(
      clipExclusiveRangeToMonth("2026-09-21", "2026-09-25", september),
    ).toEqual({ startDate: "2026-09-21", endDate: "2026-09-25" });
  });

  it("clips leave that starts in the previous month", () => {
    expect(
      clipExclusiveRangeToMonth("2026-08-28", "2026-09-04", september),
    ).toEqual({ startDate: "2026-09-01", endDate: "2026-09-04" });
  });

  it("returns null when the exclusive range misses the month", () => {
    expect(
      clipExclusiveRangeToMonth("2026-08-01", "2026-08-15", september),
    ).toBeNull();
  });
});
