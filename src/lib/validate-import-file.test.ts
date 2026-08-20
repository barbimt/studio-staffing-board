import { describe, expect, it } from "vitest";

import { MAX_IMPORT_FILE_BYTES } from "@/lib/import-limits";
import {
  importFileFieldError,
  peopleRequiredCsvLabels,
  projectsRequiredCsvLabels,
  validateImportContents,
  validateImportFile,
} from "@/lib/validate-import-file";

function file(name: string, contents = "x", size?: number) {
  const created = new File([contents], name);
  if (size !== undefined) {
    Object.defineProperty(created, "size", { value: size });
  }
  return created;
}

describe("validateImportFile", () => {
  it("requires a file on the server", () => {
    expect(validateImportFile(null, "people")).toEqual({
      message: "Please select a CSV file.",
    });
    expect(validateImportFile(null, "calendar")).toEqual({
      message: "Please select an ICS file.",
    });
  });

  it("does not treat a missing client selection as a field error", () => {
    expect(importFileFieldError(null, "people")).toBeUndefined();
  });

  it("rejects the wrong extension", () => {
    expect(validateImportFile(file("people.xlsx"), "people")).toEqual({
      message: "Please select a CSV file.",
    });
    expect(validateImportFile(file("projects.xlsx"), "projects")).toEqual({
      message: "Please select a CSV file.",
    });
    expect(validateImportFile(file("leave.ical"), "calendar")).toEqual({
      message: "Please select an ICS file.",
    });
  });

  it("rejects an empty file", () => {
    expect(validateImportFile(file("people.csv", "", 0), "people")).toEqual({
      message: "This file is empty.",
    });
  });

  it("rejects an oversized file using the shared limit", () => {
    expect(
      validateImportFile(
        file("people.csv", "x", MAX_IMPORT_FILE_BYTES + 1),
        "people",
      ),
    ).toEqual({ message: "This file is larger than 5 MB." });
  });

  it("accepts a plausible CSV or ICS selection", () => {
    expect(
      validateImportFile(file("people.csv", "a"), "people"),
    ).toBeUndefined();
    expect(
      validateImportFile(file("leave.ics", "BEGIN:VCALENDAR"), "calendar"),
    ).toBeUndefined();
  });

  it("rejects a projects export in the people slot", () => {
    expect(
      validateImportContents(
        "Name,Team,Allocation %\nOrchard Grove,Alex,60",
        "people",
      ),
    ).toEqual({
      message: "This people CSV is missing:",
      details: [...peopleRequiredCsvLabels],
    });
  });

  it("rejects a people export in the projects slot", () => {
    expect(
      validateImportContents(
        "Employee ID,Work Email\nE001,alex@example.com",
        "projects",
      ),
    ).toEqual({
      message: "This projects CSV is missing:",
      details: [...projectsRequiredCsvLabels],
    });
  });

  it("lists every missing people header", () => {
    expect(
      validateImportContents(
        "23,First Name,Last Name,Work Email,Department\nE001,Hannah,Whitmore,hannah@example.com,Studio",
        "people",
      ),
    ).toEqual({
      message: "This people CSV is missing:",
      details: ["Employee ID", "Job Title", "Site", "FTE", "Start Date"],
    });
  });
});
