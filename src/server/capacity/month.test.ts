import { describe, expect, it } from "vitest";

import {
  MonthlyCapacityError,
  currentYearMonth,
  formatMonthLabel,
  parseYearMonth,
  resolveYearMonth,
  shiftYearMonth,
  staffingMonthHref,
} from "./month";

describe("parseYearMonth", () => {
  it("derives inclusive month bounds from YYYY-MM", () => {
    expect(parseYearMonth("2026-09")).toEqual({
      year: 2026,
      month: 9,
      monthStart: "2026-09-01",
      monthEnd: "2026-09-30",
    });
  });

  it("uses 28 days for February in a common year", () => {
    expect(parseYearMonth("2026-02").monthEnd).toBe("2026-02-28");
  });

  it("uses 29 days for February in a leap year", () => {
    expect(parseYearMonth("2024-02").monthEnd).toBe("2024-02-29");
  });

  it("rejects missing, short, and out-of-range months", () => {
    for (const month of ["", "2026-9", "2026-13", "2026-00", "202609", "09"]) {
      expect(() => parseYearMonth(month)).toThrow(MonthlyCapacityError);
    }
  });
});

describe("shiftYearMonth", () => {
  it("moves to the previous and next month, including year boundaries", () => {
    expect(shiftYearMonth("2026-09", -1)).toBe("2026-08");
    expect(shiftYearMonth("2026-09", 1)).toBe("2026-10");
    expect(shiftYearMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftYearMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("resolveYearMonth", () => {
  const now = new Date(Date.UTC(2026, 7, 20));

  it("defaults to the current UTC month when the param is absent or invalid", () => {
    expect(currentYearMonth(now)).toBe("2026-08");
    expect(resolveYearMonth(undefined, now)).toBe("2026-08");
    expect(resolveYearMonth("2026-13", now)).toBe("2026-08");
    expect(resolveYearMonth(["2026-09", "2026-10"], now)).toBe("2026-09");
  });
});

describe("month presentation", () => {
  it("formats a long month label", () => {
    expect(formatMonthLabel("2026-09")).toBe("September 2026");
  });

  it("builds the month query href", () => {
    expect(staffingMonthHref("2026-08")).toBe("/?month=2026-08");
  });
});
