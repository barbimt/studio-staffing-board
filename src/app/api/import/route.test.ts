import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/import/route";
import { MAX_IMPORT_FILE_BYTES } from "@/lib/import-limits";
import { peopleRequiredCsvLabels } from "@/lib/validate-import-file";
import { StudioImportError } from "@/server/import/import-studio-data";

vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock("@/server/import/import-studio-data", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/import/import-studio-data")>();

  return {
    ...actual,
    importStudioData: vi.fn(),
  };
});

import { importStudioData } from "@/server/import/import-studio-data";

function csvFile(
  name: string,
  contents = `${peopleRequiredCsvLabels.join(",")}\nE001,Alex,Smith,a@b.com,Studio,Designer,London,1,2020-01-01`,
) {
  return new File([contents], name, { type: "text/csv" });
}

function projectsFile(
  contents = "Name,Status,Client,Platform,Start,End,Team,Allocation %\nOrchard Grove,Active,Acme,Web,2020-01-01,2020-12-31,Alex,60",
) {
  return csvFile("projects.csv", contents);
}

function icsFile(
  name = "leave.ics",
  contents = "BEGIN:VCALENDAR\nEND:VCALENDAR",
) {
  return new File([contents], name, { type: "text/calendar" });
}

function requestWith(files: {
  people?: File;
  projects?: File;
  calendar?: File;
}) {
  const body = new FormData();

  if (files.people) {
    body.set("people", files.people);
  }

  if (files.projects) {
    body.set("projects", files.projects);
  }

  if (files.calendar) {
    body.set("calendar", files.calendar);
  }

  return new Request("http://localhost/api/import", {
    method: "POST",
    body,
  });
}

describe("POST /api/import", () => {
  beforeEach(() => {
    vi.mocked(importStudioData).mockReset();
  });

  it("returns grouped field errors when files are missing", async () => {
    const response = await POST(requestWith({}));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      ok: false,
      errors: {
        people: ["Please select a CSV file."],
        projects: ["Please select a CSV file."],
        calendar: ["Please select an ICS file."],
      },
    });
    expect(importStudioData).not.toHaveBeenCalled();
  });

  it("rejects an oversized file using the shared limit", async () => {
    const people = new File(
      [new Uint8Array(MAX_IMPORT_FILE_BYTES + 1)],
      "people.csv",
      { type: "text/csv" },
    );

    const response = await POST(
      requestWith({
        people,
        projects: projectsFile(),
        calendar: icsFile(),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.errors.people).toEqual(["This file is larger than 5 MB."]);
    expect(importStudioData).not.toHaveBeenCalled();
  });

  it("maps StudioImportError to grouped JSON without a stack", async () => {
    vi.mocked(importStudioData).mockRejectedValue(
      new StudioImportError({
        people: ["Row 7: Work Email is invalid"],
        projects: [
          'Project "Orchard Grove": team member "Alex Tuner" could not be matched to a canonical person',
        ],
      }),
    );

    const response = await POST(
      requestWith({
        people: csvFile("people.csv"),
        projects: projectsFile(),
        calendar: icsFile(),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.errors.people).toEqual(["Row 7: Work Email is invalid"]);
    expect(payload.stack).toBeUndefined();
    expect(JSON.stringify(payload)).not.toMatch(/at /);
  });

  it("returns a generic payload for unknown failures", async () => {
    vi.mocked(importStudioData).mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await POST(
      requestWith({
        people: csvFile("people.csv"),
        projects: projectsFile(),
        calendar: icsFile(),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ ok: false, errors: {} });
    expect(JSON.stringify(payload)).not.toContain("ECONNREFUSED");
  });

  it("rejects swapped people and projects files before parsing rows", async () => {
    const response = await POST(
      requestWith({
        people: csvFile(
          "people.csv",
          "Name,Team,Allocation %\nOrchard Grove,Alex,60",
        ),
        projects: projectsFile(),
        calendar: icsFile(),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.errors.people).toEqual([
      "This people CSV is missing:",
      ...peopleRequiredCsvLabels,
    ]);
    expect(importStudioData).not.toHaveBeenCalled();
  });

  it("imports file text and returns ok", async () => {
    vi.mocked(importStudioData).mockResolvedValue(undefined);

    const peopleCsv = `${peopleRequiredCsvLabels.join(",")}\nE001,Alex,Smith,a@b.com,Studio,Designer,London,1,2020-01-01`;
    const projectsCsv =
      "Name,Status,Client,Platform,Start,End,Team,Allocation %\nOrchard Grove,Active,Acme,Web,2020-01-01,2020-12-31,Alex,60";
    const calendarIcs = "BEGIN:VCALENDAR\nEND:VCALENDAR";

    const response = await POST(
      requestWith({
        people: csvFile("people.csv", peopleCsv),
        projects: csvFile("projects.csv", projectsCsv),
        calendar: icsFile("leave.ics", calendarIcs),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(importStudioData).toHaveBeenCalledWith(
      {},
      {
        peopleCsv,
        projectsCsv,
        calendarIcs,
      },
    );
  });
});
