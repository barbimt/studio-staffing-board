import { describe, expect, it } from "vitest";

import { leaveLabelFromSummary } from "@/server/capacity/leave-label";

describe("leaveLabelFromSummary", () => {
  it("drops the person's name from an ICS annual-leave summary", () => {
    expect(
      leaveLabelFromSummary("Annual Leave - Wei Chen", {
        firstName: "Wei",
        lastName: "Chen",
      }),
    ).toBe("Annual Leave");
  });

  it("keeps a summary that is not suffixed with the person", () => {
    expect(
      leaveLabelFromSummary("Annual Leave", {
        firstName: "Wei",
        lastName: "Chen",
      }),
    ).toBe("Annual Leave");
  });

  it("keeps a suffix that names a different person", () => {
    expect(
      leaveLabelFromSummary("Annual Leave - Maria Costa", {
        firstName: "Wei",
        lastName: "Chen",
      }),
    ).toBe("Annual Leave - Maria Costa");
  });
});
