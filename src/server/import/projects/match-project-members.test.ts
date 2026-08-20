import { describe, expect, it } from "vitest";

import { parsePeopleCsv } from "../people/parse-people-csv";
import { readPeopleFixture } from "../people/people-csv.test-helpers";
import { matchProjectMembers } from "./match-project-members";
import { parseProjectsCsv } from "./parse-projects-csv";
import { readProjectsFixture } from "./projects-csv.test-helpers";
import type { ImportedProject } from "./projects.schema";

const orchardGrove: ImportedProject = {
  name: "Orchard Grove",
  status: "Active",
  client: "Bluebird",
  platform: "VR, PC",
  startDate: "2026-05-04",
  endDate: "2026-12-18",
  assignments: [{ personName: "Alex Turner", allocationPercentage: 60 }],
};

describe("matchProjectMembers", () => {
  it("matches names after trimming, collapsing whitespace, and ignoring case", () => {
    const resolved = matchProjectMembers(
      [
        {
          ...orchardGrove,
          assignments: [
            { personName: "  Alex   Turner ", allocationPercentage: 60 },
          ],
        },
      ],
      [{ id: 2, firstName: "Alex", lastName: "Turner" }],
    );

    expect(resolved[0]?.assignments).toEqual([
      { personId: 2, allocationPercentage: 60 },
    ]);
  });

  it("fails clearly when a team member cannot be matched", () => {
    expect(() =>
      matchProjectMembers(
        [orchardGrove],
        [{ id: 3, firstName: "Maria", lastName: "Costa" }],
      ),
    ).toThrow(
      /Project "Orchard Grove": team member "Alex Turner" could not be matched to a canonical person/,
    );
  });

  it("fails clearly when a team member matches multiple canonical people", () => {
    expect(() =>
      matchProjectMembers(
        [orchardGrove],
        [
          { id: 2, firstName: "Alex", lastName: "Turner" },
          { id: 20, firstName: "Alex", lastName: "Turner" },
        ],
      ),
    ).toThrow(
      /Project "Orchard Grove": team member "Alex Turner" matches multiple canonical people/,
    );
  });

  it("resolves a small people and projects snapshot", () => {
    const people = parsePeopleCsv(readPeopleFixture("matching-people.csv")).map(
      (person, index) => ({
        id: index + 1,
        firstName: person.firstName,
        lastName: person.lastName,
      }),
    );
    const projects = parseProjectsCsv(readProjectsFixture("valid-project.csv"));
    const resolved = matchProjectMembers(projects, people);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.assignments).toHaveLength(3);
  });
});
