import { describe, expect, it } from "vitest";

import { parsePeopleCsv } from "./parse-people-csv";
import { readPeopleFixture } from "./people-csv.test-helpers";

describe("parsePeopleCsv", () => {
  it("normalizes valid rows including empty dates and FTE", () => {
    expect(parsePeopleCsv(readPeopleFixture("people.csv"))).toEqual([
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
      {
        employeeId: "E003",
        firstName: "Maria",
        lastName: "Costa",
        workEmail: "maria.costa@example.com",
        department: "Engineering",
        jobTitle: "Developer",
        site: "Porto",
        fte: 0.8,
        startDate: "2023-02-01",
        endDate: null,
        managerEmail: "alex.turner@example.com",
      },
    ]);
  });

  it("fails clearly for invalid FTE", () => {
    expect(() => parsePeopleCsv(readPeopleFixture("invalid-fte.csv"))).toThrow(
      /Row 2: FTE is invalid/,
    );
  });

  it("fails clearly for invalid email", () => {
    expect(() =>
      parsePeopleCsv(readPeopleFixture("invalid-email.csv")),
    ).toThrow(/Row 2: Work Email is invalid/);
  });

  it("fails clearly for a missing required field", () => {
    expect(() =>
      parsePeopleCsv(readPeopleFixture("missing-first-name.csv")),
    ).toThrow(/Row 2: First Name is required/);
  });

  it("rejects duplicate Employee ID", () => {
    expect(() =>
      parsePeopleCsv(readPeopleFixture("duplicate-employee-id.csv")),
    ).toThrow(/Employee ID is duplicated/);
  });

  it("rejects duplicate normalized Work Email", () => {
    expect(() =>
      parsePeopleCsv(readPeopleFixture("duplicate-email.csv")),
    ).toThrow(/Work Email is duplicated/);
  });

  it("normalizes work email by trimming and lowercasing", () => {
    const [person] = parsePeopleCsv(
      readPeopleFixture("email-to-normalize.csv"),
    );

    expect(person.workEmail).toBe("alex@example.com");
  });

  it("treats missing End Date and Manager Email headers as empty", () => {
    expect(
      parsePeopleCsv(readPeopleFixture("without-optional-headers.csv")),
    ).toEqual([
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

  it("rejects an End Date before Start Date", () => {
    expect(() =>
      parsePeopleCsv(readPeopleFixture("end-before-start.csv")),
    ).toThrow(/Row 2: End Date must be on or after Start Date/);
  });

  it("keeps quoted commas inside CSV fields", () => {
    const [person] = parsePeopleCsv(readPeopleFixture("quoted-name.csv"));

    expect(person.firstName).toBe("Hannah, Jr");
  });
});
