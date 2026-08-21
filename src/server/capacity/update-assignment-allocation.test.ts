import { describe, expect, it } from "vitest";

import { assignmentAllocationInputSchema } from "./update-assignment-allocation";

describe("assignmentAllocationInputSchema", () => {
  it("accepts 0 and over-allocation", () => {
    expect(
      assignmentAllocationInputSchema.parse({
        assignmentId: "3",
        personId: "1",
        month: "2026-09",
        allocationPercentage: "0",
      }),
    ).toEqual({
      assignmentId: 3,
      personId: 1,
      month: "2026-09",
      allocationPercentage: 0,
    });
    expect(
      assignmentAllocationInputSchema.parse({
        assignmentId: "3",
        personId: "1",
        month: "2026-09",
        allocationPercentage: "140",
      }).allocationPercentage,
    ).toBe(140);
  });

  it("rejects negatives, blanks, fractions, and bad months", () => {
    expect(
      assignmentAllocationInputSchema.safeParse({
        assignmentId: "3",
        personId: "1",
        month: "2026-09",
        allocationPercentage: "",
      }).success,
    ).toBe(false);
    expect(
      assignmentAllocationInputSchema.safeParse({
        assignmentId: "3",
        personId: "1",
        month: "2026-09",
        allocationPercentage: "-10",
      }).success,
    ).toBe(false);
    expect(
      assignmentAllocationInputSchema.safeParse({
        assignmentId: "3",
        personId: "1",
        month: "2026-09",
        allocationPercentage: "12.5",
      }).success,
    ).toBe(false);
    expect(
      assignmentAllocationInputSchema.safeParse({
        assignmentId: "3",
        personId: "1",
        month: "2026-13",
        allocationPercentage: "50",
      }).success,
    ).toBe(false);
  });
});
