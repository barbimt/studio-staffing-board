import { describe, expect, it } from "vitest";

import { parseProjectsCsv } from "./parse-projects-csv";
import { readProjectsFixture } from "./projects-csv.test-helpers";

describe("parseProjectsCsv", () => {
  it("normalizes a valid project row including team and allocation pairing", () => {
    expect(parseProjectsCsv(readProjectsFixture("valid-project.csv"))).toEqual([
      {
        name: "Orchard Grove",
        status: "Active",
        client: "Bluebird",
        platform: "VR, PC",
        startDate: "2026-05-04",
        endDate: "2026-12-18",
        assignments: [
          { personName: "Alex Turner", allocationPercentage: 60 },
          { personName: "Maria Costa", allocationPercentage: 50 },
          { personName: "Samuel Adeyemi", allocationPercentage: 100 },
        ],
      },
    ]);
  });

  it("fails clearly when Team and Allocation % lengths differ", () => {
    expect(() =>
      parseProjectsCsv(readProjectsFixture("mismatched-lists.csv")),
    ).toThrow(
      /Row 2: Team and Allocation % must contain the same number of entries/,
    );
  });

  it("fails clearly for an invalid allocation", () => {
    expect(() =>
      parseProjectsCsv(readProjectsFixture("invalid-allocation.csv")),
    ).toThrow(/Row 2: Allocation % is invalid/);
  });

  it("fails clearly for a missing required field", () => {
    expect(() =>
      parseProjectsCsv(readProjectsFixture("missing-name.csv")),
    ).toThrow(/Row 2: Name is required/);
  });

  it("keeps quoted commas inside CSV fields", () => {
    const [project] = parseProjectsCsv(
      readProjectsFixture("quoted-platform.csv"),
    );

    expect(project.platform).toBe("VR, PC");
  });

  it("rejects duplicate project names", () => {
    expect(() =>
      parseProjectsCsv(readProjectsFixture("duplicate-name.csv")),
    ).toThrow(/Name is duplicated/);
  });

  it("treats empty Team and Allocation % as zero assignments", () => {
    expect(
      parseProjectsCsv(readProjectsFixture("empty-assignments.csv")),
    ).toEqual([
      {
        name: "Empty Team",
        status: "Active",
        client: "Internal",
        platform: "PC",
        startDate: "2026-05-04",
        endDate: "2026-12-18",
        assignments: [],
      },
    ]);
  });

  it("parses a multi-person project snapshot", () => {
    const projects = parseProjectsCsv(readProjectsFixture("valid-project.csv"));

    expect(projects).toHaveLength(1);
    expect(projects[0]?.assignments).toHaveLength(3);
  });
});
