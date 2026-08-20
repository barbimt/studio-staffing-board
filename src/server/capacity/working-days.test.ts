import { describe, expect, it } from "vitest";

import { parseYearMonth } from "./month";
import { weekdaysInExclusiveRange, workingDaysInMonth } from "./working-days";

const september = parseYearMonth("2026-09");
const august = parseYearMonth("2026-08");

describe("workingDaysInMonth", () => {
  it("counts Monday to Friday in September 2026", () => {
    const days = workingDaysInMonth(september);

    expect(days).toHaveLength(22);
    expect(days[0]).toBe("2026-09-01");
    expect(days.at(-1)).toBe("2026-09-30");
    expect(days).not.toContain("2026-09-05");
    expect(days).not.toContain("2026-09-06");
  });
});

describe("weekdaysInExclusiveRange", () => {
  it("keeps exclusive DTEND and skips weekends", () => {
    expect(
      weekdaysInExclusiveRange({
        startDate: "2026-09-21",
        endDate: "2026-09-26",
        month: september,
      }),
    ).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
    ]);
  });

  it("ignores a weekend holiday", () => {
    expect(
      weekdaysInExclusiveRange({
        startDate: "2026-08-01",
        endDate: "2026-08-02",
        month: august,
      }),
    ).toEqual([]);
  });

  it("clips leave that crosses a month boundary", () => {
    expect(
      weekdaysInExclusiveRange({
        startDate: "2026-08-31",
        endDate: "2026-09-03",
        month: september,
      }),
    ).toEqual(["2026-09-01", "2026-09-02"]);
    expect(
      weekdaysInExclusiveRange({
        startDate: "2026-08-31",
        endDate: "2026-09-03",
        month: august,
      }),
    ).toEqual(["2026-08-31"]);
  });
});
