/** @vitest-environment jsdom */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImportDataDialog } from "@/components/staffing/import-data-dialog";
import { Button } from "@/components/ui/button";
import { MAX_IMPORT_FILE_BYTES } from "@/lib/import-limits";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const peopleCsv = "Employee ID,First Name\nE001,Alex";
const projectsCsv = "Name,Team\nOrchard Grove,Alex";
const calendarIcs = "BEGIN:VCALENDAR\nEND:VCALENDAR";

function csv(name: string, contents: string) {
  return new File([contents], name, { type: "text/csv" });
}

function ics(name: string, contents: string) {
  return new File([contents], name, { type: "text/calendar" });
}

function renderDialog(hasStaffingData = false) {
  return render(
    <ImportDataDialog
      hasStaffingData={hasStaffingData}
      trigger={<Button>Import data</Button>}
    />,
  );
}

function choose(label: string, file: File) {
  fireEvent.change(screen.getByLabelText(label), {
    target: { files: [file] },
  });
}

function submitButton() {
  return within(screen.getByRole("dialog")).getByRole("button", {
    name: "Import data",
  });
}

function chooseValidFiles() {
  choose("People — CSV", csv("people-export.csv", peopleCsv));
  choose("Projects — CSV", csv("projects-export.csv", projectsCsv));
  choose("Leave calendar — ICS", ics("leave-calendar.ics", calendarIcs));
}

describe("ImportDataDialog", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("opens from Import data and keeps submit disabled until all files are valid", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Import data" }));

    expect(
      await screen.findByRole("heading", { name: "Import studio data" }),
    ).toBeVisible();
    expect(submitButton()).toBeDisabled();

    choose("People — CSV", csv("people-export.csv", peopleCsv));
    expect(screen.getByText("people-export.csv")).toBeVisible();
    expect(submitButton()).toBeDisabled();

    chooseValidFiles();
    expect(submitButton()).toBeEnabled();
  });

  it("shows a field error for the wrong People extension", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Import data" }));
    await screen.findByLabelText("People — CSV");

    choose("People — CSV", csv("employees.xlsx", "rows"));

    expect(screen.getByText("Please select a CSV file.")).toBeVisible();
    expect(screen.getByLabelText("People — CSV")).toHaveAccessibleDescription(
      "Please select a CSV file.",
    );
  });

  it("shows a field error for the wrong Projects extension", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Import data" }));
    await screen.findByLabelText("Projects — CSV");

    choose("Projects — CSV", csv("projects.xlsx", "rows"));

    expect(screen.getByText("Please select a CSV file.")).toBeVisible();
  });

  it("shows a field error for the wrong Calendar extension", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Import data" }));
    await screen.findByLabelText("Leave calendar — ICS");

    choose("Leave calendar — ICS", new File(["rows"], "leave.txt"));

    expect(screen.getByText("Please select an ICS file.")).toBeVisible();
  });

  it("shows a field error for an empty file", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Import data" }));
    await screen.findByLabelText("People — CSV");

    const empty = csv("people.csv", "");
    Object.defineProperty(empty, "size", { value: 0 });
    choose("People — CSV", empty);

    expect(screen.getByText("This file is empty.")).toBeVisible();
  });

  it("shows a field error for an oversized file", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Import data" }));
    await screen.findByLabelText("People — CSV");

    const oversized = csv("people.csv", "rows");
    Object.defineProperty(oversized, "size", {
      value: MAX_IMPORT_FILE_BYTES + 1,
    });
    choose("People — CSV", oversized);

    expect(screen.getByText("This file is larger than 5 MB.")).toBeVisible();
  });

  it("keeps the dialog open and groups server errors by source", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          errors: {
            people: ["Row 7: Work Email is invalid"],
            projects: [
              'Project "Orchard Grove": team member "Alex Tuner" could not be matched to a canonical person',
            ],
            calendar: [
              'Event "Annual Leave" (UID 1): attendee "alex@example.com" could not be matched to a canonical person',
            ],
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Import data" }));
    await screen.findByLabelText("People — CSV");
    chooseValidFiles();
    fireEvent.click(submitButton());

    expect(
      await screen.findByText("We couldn't import the studio data."),
    ).toBeVisible();
    expect(screen.getByText("Row 7: Work Email is invalid")).toBeVisible();
    expect(
      screen.getByText(
        'Project "Orchard Grove": team member "Alex Tuner" could not be matched to a canonical person',
      ),
    ).toBeVisible();
    expect(screen.getByText(/attendee "alex@example.com"/)).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Import studio data" }),
    ).toBeVisible();
    expect(screen.getByText(/people-export.csv/)).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("lets the user replace one file and retry after a failure", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
            errors: {
              projects: [
                'Project "Orchard Grove": team member "Alex Tuner" could not be matched to a canonical person',
              ],
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Import data" }));
    await screen.findByLabelText("People — CSV");
    chooseValidFiles();
    fireEvent.click(submitButton());

    expect(await screen.findByText(/Alex Tuner/)).toBeVisible();
    expect(screen.getByText("people-export.csv")).toBeVisible();

    choose("Projects — CSV", csv("projects-fixed.csv", projectsCsv));
    fireEvent.click(submitButton());

    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
    expect(
      screen.queryByRole("heading", { name: "Import studio data" }),
    ).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("closes on success, refreshes the board, and announces completion", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Import data" }));
    await screen.findByLabelText("People — CSV");
    chooseValidFiles();
    fireEvent.click(submitButton());

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByRole("heading", { name: "Import studio data" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Studio data imported.")).toBeInTheDocument();
  });

  it("shows the re-import warning when staffing data already exists", async () => {
    renderDialog(true);
    fireEvent.click(screen.getByRole("button", { name: "Import data" }));

    expect(
      await screen.findByText(
        /Importing new studio data will update the current staffing data/,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        /Project allocations will be replaced by the latest imported values/,
      ),
    ).toBeVisible();
  });
});
