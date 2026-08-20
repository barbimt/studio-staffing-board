import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parsePeopleCsv, PeopleImportError } from "./parse-people-csv";

const HEADER =
  "Employee ID,First Name,Last Name,Work Email,Department,Job Title,Site,FTE,Start Date,End Date,Manager Email";

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

const validRow =
  "E001,Hannah,Whitmore,hannah.whitmore@example.com,Studio,Studio Director,Bristol,1.0,2021-03-01,,";

describe("parsePeopleCsv", () => {
  it("produces a normalized person from a valid CSV row", () => {
    expect(parsePeopleCsv(csv(validRow))).toEqual([
      {
        employeeId: "E001",
        firstName: "Hannah",
        lastName: "Whitmore",
        workEmail: "hannah.whitmore@example.com",
        department: "Studio",
        jobTitle: "Studio Director",
        site: "Bristol",
        fte: 1,
        startDate: "2021-03-01",
        endDate: null,
        managerEmail: null,
      },
    ]);
  });

  it("converts empty End Date and Manager Email to null", () => {
    const [person] = parsePeopleCsv(
      csv(
        "E001,Hannah,Whitmore,hannah.whitmore@example.com,Studio,Studio Director,Bristol,1.0,2021-03-01,,",
      ),
    );

    expect(person.endDate).toBeNull();
    expect(person.managerEmail).toBeNull();
  });

  it("parses FTE 0.8 as a number", () => {
    const [person] = parsePeopleCsv(
      csv(
        "E003,Maria,Costa,maria.costa@example.com,Engineering,Developer,Porto,0.8,2023-02-01,,alex.turner@example.com",
      ),
    );

    expect(person.fte).toBe(0.8);
  });

  it("fails clearly for invalid FTE", () => {
    expect(() =>
      parsePeopleCsv(
        csv(
          "E001,Hannah,Whitmore,hannah.whitmore@example.com,Studio,Studio Director,Bristol,abc,2021-03-01,,",
        ),
      ),
    ).toThrow(PeopleImportError);

    expect(() =>
      parsePeopleCsv(
        csv(
          "E001,Hannah,Whitmore,hannah.whitmore@example.com,Studio,Studio Director,Bristol,abc,2021-03-01,,",
        ),
      ),
    ).toThrow(/Row 2: FTE is invalid/);
  });

  it("fails clearly for invalid email", () => {
    expect(() =>
      parsePeopleCsv(
        csv(
          "E001,Hannah,Whitmore,not-an-email,Studio,Studio Director,Bristol,1.0,2021-03-01,,",
        ),
      ),
    ).toThrow(/Row 2: Work Email is invalid/);
  });

  it("fails clearly for a missing required field", () => {
    expect(() =>
      parsePeopleCsv(
        csv(
          "E001,,Whitmore,hannah.whitmore@example.com,Studio,Studio Director,Bristol,1.0,2021-03-01,,",
        ),
      ),
    ).toThrow(/Row 2: First Name is required/);
  });

  it("rejects duplicate Employee ID", () => {
    expect(() =>
      parsePeopleCsv(
        csv(
          validRow,
          "E001,Alex,Turner,alex.turner@example.com,Engineering,Lead Developer,Bristol,1.0,2022-06-13,,hannah.whitmore@example.com",
        ),
      ),
    ).toThrow(/Employee ID is duplicated/);
  });

  it("rejects duplicate normalized Work Email", () => {
    expect(() =>
      parsePeopleCsv(
        csv(
          validRow,
          "E002,Alex,Turner, Hannah.Whitmore@example.com,Engineering,Lead Developer,Bristol,1.0,2022-06-13,,",
        ),
      ),
    ).toThrow(/Work Email is duplicated/);
  });

  it("normalizes work email by trimming and lowercasing", () => {
    const [person] = parsePeopleCsv(
      csv(
        "E001,Hannah,Whitmore, Alex@example.com,Studio,Studio Director,Bristol,1.0,2021-03-01,,",
      ),
    );

    expect(person.workEmail).toBe("alex@example.com");
  });

  it("keeps quoted commas inside CSV fields", () => {
    const [person] = parsePeopleCsv(
      csv(
        'E001,"Hannah, Jr",Whitmore,hannah.whitmore@example.com,Studio,Studio Director,Bristol,1.0,2021-03-01,,',
      ),
    );

    expect(person.firstName).toBe("Hannah, Jr");
  });

  it("parses the real people fixture into 15 unique people", () => {
    const fixture = readFileSync(
      fileURLToPath(
        new URL("../../../../data/people-export.csv", import.meta.url),
      ),
      "utf8",
    );

    const people = parsePeopleCsv(fixture);

    expect(people).toHaveLength(15);
    expect(new Set(people.map((person) => person.employeeId)).size).toBe(15);
    expect(new Set(people.map((person) => person.workEmail)).size).toBe(15);
    expect(people[0]).toMatchObject({
      employeeId: "E001",
      workEmail: "hannah.whitmore@example.com",
      endDate: null,
      managerEmail: null,
    });
    expect(people[5]).toMatchObject({
      employeeId: "E006",
      endDate: "2026-06-30",
      fte: 1,
    });
  });
});
