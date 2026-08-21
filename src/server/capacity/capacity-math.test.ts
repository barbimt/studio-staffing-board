import { describe, expect, it } from "vitest";

import { previewMonthlyAllocation } from "./capacity-math";

describe("previewMonthlyAllocation", () => {
  it("keeps other assignments and flags over-allocation", () => {
    expect(
      previewMonthlyAllocation({
        effectiveCapacityPercentage: 61.82,
        otherAllocationPercentage: 50,
        draftAllocationPercentage: 20,
      }),
    ).toEqual({
      totalAllocationPercentage: 70,
      remainingCapacityPercentage: -8.18,
      status: "overcommitted",
    });
  });

  it("allows a 0% draft without deleting other work", () => {
    expect(
      previewMonthlyAllocation({
        effectiveCapacityPercentage: 80,
        otherAllocationPercentage: 40,
        draftAllocationPercentage: 0,
      }),
    ).toEqual({
      totalAllocationPercentage: 40,
      remainingCapacityPercentage: 40,
      status: "available",
    });
  });
});
