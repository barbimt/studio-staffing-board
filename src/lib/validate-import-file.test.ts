import { describe, expect, it } from "vitest";

import { MAX_IMPORT_FILE_BYTES } from "@/lib/import-limits";
import {
  importFileFieldError,
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
    expect(validateImportFile(null, "people")).toBe(
      "Please select a CSV file.",
    );
    expect(validateImportFile(null, "calendar")).toBe(
      "Please select an ICS file.",
    );
  });

  it("does not treat a missing client selection as a field error", () => {
    expect(importFileFieldError(null, "people")).toBeUndefined();
  });

  it("rejects the wrong extension", () => {
    expect(validateImportFile(file("people.xlsx"), "people")).toBe(
      "Please select a CSV file.",
    );
    expect(validateImportFile(file("projects.xlsx"), "projects")).toBe(
      "Please select a CSV file.",
    );
    expect(validateImportFile(file("leave.ical"), "calendar")).toBe(
      "Please select an ICS file.",
    );
  });

  it("rejects an empty file", () => {
    expect(validateImportFile(file("people.csv", "", 0), "people")).toBe(
      "This file is empty.",
    );
  });

  it("rejects an oversized file using the shared limit", () => {
    expect(
      validateImportFile(
        file("people.csv", "x", MAX_IMPORT_FILE_BYTES + 1),
        "people",
      ),
    ).toBe("This file is larger than 5 MB.");
  });

  it("accepts a plausible CSV or ICS selection", () => {
    expect(
      validateImportFile(file("people.csv", "a"), "people"),
    ).toBeUndefined();
    expect(
      validateImportFile(file("leave.ics", "BEGIN:VCALENDAR"), "calendar"),
    ).toBeUndefined();
  });
});
