import { describe, expect, it } from "vitest";

import { mergeUnavailableWeekdays } from "./unavailable-weekdays";

describe("mergeUnavailableWeekdays", () => {
  it("reports leave and holiday counts and unions them for capacity", () => {
    expect(
      mergeUnavailableWeekdays(
        ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"],
        ["2026-09-07"],
      ),
    ).toEqual({
      leaveWeekdays: 4,
      holidayWeekdays: 1,
      overlappingWeekdays: 0,
      unavailableWeekdays: 5,
    });
  });

  it("counts an overlapping weekday once toward unavailable days", () => {
    expect(mergeUnavailableWeekdays(["2026-09-07"], ["2026-09-07"])).toEqual({
      leaveWeekdays: 1,
      holidayWeekdays: 1,
      overlappingWeekdays: 1,
      unavailableWeekdays: 1,
    });
  });
});
