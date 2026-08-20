import { describe, expect, it } from "vitest";

import { MonthlyCapacityError, parseYearMonth } from "./month";

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
