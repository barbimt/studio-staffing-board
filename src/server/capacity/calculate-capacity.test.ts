import { describe, expect, it } from "vitest";

import {
  buildMonthlyPersonCapacity,
  calculateCapacityStatus,
  calculateContractualCapacityPercentage,
  calculateTotalAllocation,
  isPersonActiveInMonth,
  isProjectActiveInMonth,
  type CapacityPerson,
} from "./calculate-capacity";
import { parseYearMonth } from "./month";

const september = parseYearMonth("2026-09");

const priya: CapacityPerson = {
  id: 5,
  employeeId: "E005",
  firstName: "Priya",
  lastName: "Nair",
  jobTitle: "Game Designer",
  site: "Bristol",
  fte: 0.6,
};

describe("calculateContractualCapacityPercentage", () => {
  it("maps FTE to a contractual percentage", () => {
    expect(calculateContractualCapacityPercentage(1)).toBe(100);
    expect(calculateContractualCapacityPercentage(0.8)).toBe(80);
    expect(calculateContractualCapacityPercentage(0.6)).toBe(60);
  });
});

describe("calculateTotalAllocation", () => {
  it("is 0 when there are no assignments", () => {
    expect(calculateTotalAllocation([])).toBe(0);
  });

  it("sums allocation across assignments", () => {
    expect(
      calculateTotalAllocation([
        { allocationPercentage: 40 },
        { allocationPercentage: 30 },
      ]),
    ).toBe(70);
  });
});

describe("calculateCapacityStatus", () => {
  it("is available below contractual capacity", () => {
    expect(
      calculateCapacityStatus({
        contractualCapacityPercentage: 100,
        totalAllocation: 70,
      }),
    ).toBe("available");
  });

  it("is at_capacity on the exact boundary", () => {
    expect(
      calculateCapacityStatus({
        contractualCapacityPercentage: 80,
        totalAllocation: 80,
      }),
    ).toBe("at_capacity");
  });

  it("is overcommitted above contractual capacity, including over 100", () => {
    expect(
      calculateCapacityStatus({
        contractualCapacityPercentage: 100,
        totalAllocation: 110,
      }),
    ).toBe("overcommitted");
    expect(
      calculateCapacityStatus({
        contractualCapacityPercentage: 60,
        totalAllocation: 70,
      }),
    ).toBe("overcommitted");
  });
});

describe("buildMonthlyPersonCapacity", () => {
  it("keeps a person with no assignments as available", () => {
    const result = buildMonthlyPersonCapacity(
      { ...priya, fte: 1, firstName: "Ben", lastName: "Fletcher" },
      [],
    );

    expect(result.projects).toEqual([]);
    expect(result.contractualCapacityPercentage).toBe(100);
    expect(result.totalAllocation).toBe(0);
    expect(result.remainingCapacity).toBe(100);
    expect(result.status).toBe("available");
  });

  it("flags part-time overcommitment", () => {
    const result = buildMonthlyPersonCapacity(priya, [
      { id: 1, name: "Project A", allocationPercentage: 40 },
      { id: 2, name: "Project B", allocationPercentage: 30 },
    ]);

    expect(result.contractualCapacityPercentage).toBe(60);
    expect(result.totalAllocation).toBe(70);
    expect(result.remainingCapacity).toBe(-10);
    expect(result.status).toBe("overcommitted");
  });

  it("keeps remainingCapacity at 0 when allocation matches 0.8 FTE", () => {
    const result = buildMonthlyPersonCapacity({ ...priya, fte: 0.8 }, [
      { id: 1, name: "Project A", allocationPercentage: 80 },
    ]);

    expect(result.remainingCapacity).toBe(0);
    expect(result.status).toBe("at_capacity");
  });

  it("allows full-time allocation over 100", () => {
    const result = buildMonthlyPersonCapacity({ ...priya, fte: 1 }, [
      { id: 1, name: "Project A", allocationPercentage: 110 },
    ]);

    expect(result.contractualCapacityPercentage).toBe(100);
    expect(result.totalAllocation).toBe(110);
    expect(result.remainingCapacity).toBe(-10);
    expect(result.status).toBe("overcommitted");
  });
});

describe("isProjectActiveInMonth", () => {
  it("includes a project that spans the whole month", () => {
    expect(
      isProjectActiveInMonth(
        { startDate: "2026-05-04", endDate: "2026-12-18" },
        september,
      ),
    ).toBe(true);
  });

  it("includes a project that starts during the month", () => {
    expect(
      isProjectActiveInMonth(
        { startDate: "2026-09-15", endDate: "2026-11-20" },
        september,
      ),
    ).toBe(true);
  });

  it("includes a project that ends during the month", () => {
    expect(
      isProjectActiveInMonth(
        { startDate: "2026-06-01", endDate: "2026-09-12" },
        september,
      ),
    ).toBe(true);
  });

  it("excludes a project that ends before the month", () => {
    expect(
      isProjectActiveInMonth(
        { startDate: "2025-11-03", endDate: "2026-03-27" },
        september,
      ),
    ).toBe(false);
  });

  it("excludes a project that starts after the month", () => {
    expect(
      isProjectActiveInMonth(
        { startDate: "2026-10-01", endDate: "2027-02-26" },
        september,
      ),
    ).toBe(false);
  });

  it("includes projects that start or end on the month boundaries", () => {
    expect(
      isProjectActiveInMonth(
        { startDate: "2026-09-01", endDate: "2026-09-30" },
        september,
      ),
    ).toBe(true);
    expect(
      isProjectActiveInMonth(
        { startDate: "2026-06-01", endDate: "2026-09-30" },
        september,
      ),
    ).toBe(true);
    expect(
      isProjectActiveInMonth(
        { startDate: "2026-09-01", endDate: "2026-12-18" },
        september,
      ),
    ).toBe(true);
  });

  it("does not use project status when deciding overlap", () => {
    expect(
      isProjectActiveInMonth(
        { startDate: "2026-10-01", endDate: "2027-02-26" },
        parseYearMonth("2026-10"),
      ),
    ).toBe(true);
  });
});

describe("isPersonActiveInMonth", () => {
  it("includes someone employed for the whole month", () => {
    expect(
      isPersonActiveInMonth(
        { startDate: "2022-06-13", endDate: null },
        september,
      ),
    ).toBe(true);
  });

  it("includes someone who starts during the month", () => {
    expect(
      isPersonActiveInMonth(
        { startDate: "2026-09-15", endDate: null },
        september,
      ),
    ).toBe(true);
  });

  it("includes someone who ends during the month", () => {
    expect(
      isPersonActiveInMonth(
        { startDate: "2022-11-21", endDate: "2026-09-12" },
        september,
      ),
    ).toBe(true);
  });

  it("includes someone with a null end date after they have started", () => {
    expect(
      isPersonActiveInMonth(
        { startDate: "2021-03-01", endDate: null },
        september,
      ),
    ).toBe(true);
  });

  it("excludes someone who ended before the month", () => {
    expect(
      isPersonActiveInMonth(
        { startDate: "2022-11-21", endDate: "2026-06-30" },
        september,
      ),
    ).toBe(false);
  });

  it("excludes someone who starts after the month", () => {
    expect(
      isPersonActiveInMonth(
        { startDate: "2026-10-01", endDate: null },
        september,
      ),
    ).toBe(false);
  });
});

describe("inactive project allocation", () => {
  it("does not contribute allocation from a project outside the month", () => {
    const assignments = [
      {
        project: { startDate: "2026-05-04", endDate: "2026-12-18" },
        allocationPercentage: 60,
      },
      {
        project: { startDate: "2025-11-03", endDate: "2026-03-27" },
        allocationPercentage: 80,
      },
    ];

    const active = assignments.filter((assignment) =>
      isProjectActiveInMonth(assignment.project, september),
    );

    expect(calculateTotalAllocation(active)).toBe(60);
  });
});
