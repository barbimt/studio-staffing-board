/** @vitest-environment jsdom */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StaffingBoard } from "@/components/staffing/staffing-board";
import type { MonthlyPersonCapacity } from "@/server/capacity/calculate-capacity";
import { peopleRequiredCsvLabels } from "@/lib/validate-import-file";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const peopleCsv = `${peopleRequiredCsvLabels.join(",")}\nE001,Alex,Smith,alex@example.com,Studio,Designer,London,1,2020-01-01`;
const projectsCsv =
  "Name,Status,Client,Platform,Start,End,Team,Allocation %\nOrchard Grove,Active,Acme,Web,2020-01-01,2020-12-31,Alex,60";
const calendarIcs = "BEGIN:VCALENDAR\nEND:VCALENDAR";

function csv(name: string, contents: string) {
  return new File([contents], name, { type: "text/csv" });
}

function ics(name: string, contents: string) {
  return new File([contents], name, { type: "text/calendar" });
}

function person({
  person: personFields,
  projects,
  ...rest
}: Partial<MonthlyPersonCapacity> = {}): MonthlyPersonCapacity {
  return {
    person: {
      id: 1,
      employeeId: "E001",
      firstName: "Alex",
      lastName: "Turner",
      jobTitle: "Lead Developer",
      site: "Bristol",
      fte: 1,
      ...personFields,
    },
    projects: projects ?? [
      { id: 10, name: "Orchard Grove", allocationPercentage: 60 },
      { id: 11, name: "Pebble Rush", allocationPercentage: 50 },
    ],
    contractualCapacityPercentage: 100,
    totalAllocation: 110,
    remainingCapacity: -10,
    status: "overcommitted",
    ...rest,
  };
}

describe("StaffingBoard", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders people, role, site, projects, capacity, and status", () => {
    render(
      <StaffingBoard month="2026-09" hasStaffingData people={[person()]} />,
    );

    expect(
      screen.getByRole("heading", { name: "Studio Staffing Board" }),
    ).toBeVisible();
    expect(screen.getByText("Alex Turner")).toBeVisible();
    expect(screen.getByText("Lead Developer")).toBeVisible();
    expect(screen.getByText("Bristol")).toBeVisible();
    expect(screen.getByText("Orchard Grove 60%")).toBeVisible();
    expect(screen.getByText("Pebble Rush 50%")).toBeVisible();
    expect(screen.getByText("110% allocated")).toBeVisible();
    expect(screen.getByText("100% capacity")).toBeVisible();
    expect(screen.getByText("10% over")).toBeVisible();
    expect(screen.getByText("Over capacity")).toBeVisible();
  });

  it("shows remaining over-capacity from provided domain values", () => {
    render(
      <StaffingBoard
        month="2026-09"
        hasStaffingData
        people={[
          person({
            contractualCapacityPercentage: 60,
            totalAllocation: 70,
            remainingCapacity: -10,
            status: "overcommitted",
            projects: [{ id: 20, name: "Lantern", allocationPercentage: 70 }],
            person: {
              id: 2,
              employeeId: "E005",
              firstName: "Priya",
              lastName: "Nair",
              jobTitle: "Developer",
              site: "Porto",
              fte: 0.6,
            },
          }),
        ]}
      />,
    );

    expect(screen.getByText("70% allocated")).toBeVisible();
    expect(screen.getByText("60% capacity")).toBeVisible();
    expect(screen.getByText("10% over")).toBeVisible();
    expect(screen.getByText("Over capacity")).toBeVisible();
  });

  it("renders At capacity, not Near capacity", () => {
    render(
      <StaffingBoard
        month="2026-09"
        hasStaffingData
        people={[
          person({
            totalAllocation: 80,
            contractualCapacityPercentage: 80,
            remainingCapacity: 0,
            status: "at_capacity",
            projects: [
              { id: 30, name: "Orchard Grove", allocationPercentage: 80 },
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByText("At capacity")).toBeVisible();
    expect(screen.queryByText("Near capacity")).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+% available/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+% over/)).not.toBeInTheDocument();
  });

  it("renders No projects when a person has none", () => {
    render(
      <StaffingBoard
        month="2026-06"
        hasStaffingData
        people={[
          person({
            projects: [],
            totalAllocation: 0,
            remainingCapacity: 100,
            status: "available",
          }),
        ]}
      />,
    );

    expect(screen.getByText("No projects")).toBeVisible();
    expect(screen.getByText("Available")).toBeVisible();
  });

  it("shows the first-run import CTA when no staffing data exists", () => {
    render(
      <StaffingBoard month="2026-09" hasStaffingData={false} people={[]} />,
    );

    expect(screen.getByText("No staffing data yet")).toBeVisible();
    expect(screen.getByRole("button", { name: "Import data" })).toBeEnabled();
    expect(screen.getByRole("columnheader", { name: "Person" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Site" })).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: "Projects" }),
    ).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: "Capacity" }),
    ).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeVisible();
    expect(
      screen.queryByText("No people active in this month"),
    ).not.toBeInTheDocument();
  });

  it("shows an empty month without the first-run prompt", () => {
    render(<StaffingBoard month="2026-09" hasStaffingData people={[]} />);

    expect(screen.getByText("No people active in this month")).toBeVisible();
    expect(screen.queryByText("No staffing data yet")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import data" })).toBeEnabled();
  });

  it("points previous and next month controls at the month query param", () => {
    render(
      <StaffingBoard month="2026-09" hasStaffingData people={[person()]} />,
    );

    expect(
      screen.getByRole("link", { name: "Previous month" }),
    ).toHaveAttribute("href", "/?month=2026-08");
    expect(screen.getByRole("link", { name: "Next month" })).toHaveAttribute(
      "href",
      "/?month=2026-10",
    );
    expect(screen.getByText("September 2026")).toBeVisible();
  });

  it("exposes a resize control for each resizable column", () => {
    render(
      <StaffingBoard month="2026-09" hasStaffingData people={[person()]} />,
    );

    for (const column of ["Projects", "Capacity"]) {
      expect(
        screen.getByRole("button", { name: `Resize ${column} column` }),
      ).toBeVisible();
    }

    for (const column of ["Person", "Site", "Status"]) {
      expect(
        screen.queryByRole("button", { name: `Resize ${column} column` }),
      ).not.toBeInTheDocument();
    }
  });

  it("resizes a column with arrow keys", () => {
    render(
      <StaffingBoard month="2026-09" hasStaffingData people={[person()]} />,
    );

    const handle = screen.getByRole("button", {
      name: "Resize Projects column",
    });
    const header = handle.closest("th");

    expect(header).toHaveStyle({ width: "250px" });

    fireEvent.keyDown(handle, { key: "ArrowRight" });

    expect(header).toHaveStyle({ width: "266px" });

    fireEvent.keyDown(handle, { key: "Home" });

    expect(header).toHaveStyle({ width: "250px" });
  });

  it("keeps the current board visible while import is pending and after a failed persist", async () => {
    let resolveImport!: (value: Response) => void;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveImport = resolve;
        }),
    );

    render(
      <StaffingBoard month="2026-09" hasStaffingData people={[person()]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Import data" }));
    await screen.findByLabelText("People — CSV");

    fireEvent.change(screen.getByLabelText("People — CSV"), {
      target: { files: [csv("people-export.csv", peopleCsv)] },
    });
    fireEvent.change(screen.getByLabelText("Projects — CSV"), {
      target: { files: [csv("projects-export.csv", projectsCsv)] },
    });
    fireEvent.change(screen.getByLabelText("Leave calendar — ICS"), {
      target: { files: [ics("leave-calendar.ics", calendarIcs)] },
    });

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => {
      expect(
        within(dialog).getByRole("button", { name: "Import data" }),
      ).toBeEnabled();
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Import data" }),
    );

    expect(
      await within(dialog).findByRole("button", { name: "Importing…" }),
    ).toBeDisabled();
    expect(screen.getByText("Alex Turner")).toBeVisible();
    expect(screen.getByText("Orchard Grove 60%")).toBeVisible();
    expect(screen.queryByText("No staffing data yet")).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();

    resolveImport(
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
    );

    expect(
      await screen.findByText("We couldn't import the studio data."),
    ).toBeVisible();
    expect(screen.getByText(/Alex Tuner/)).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Import studio data" }),
    ).toBeVisible();
    expect(screen.getByText("Alex Turner")).toBeVisible();
    expect(screen.getByText("Orchard Grove 60%")).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes the board only after a successful retry", async () => {
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

    render(
      <StaffingBoard month="2026-09" hasStaffingData people={[person()]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Import data" }));
    await screen.findByLabelText("People — CSV");

    fireEvent.change(screen.getByLabelText("People — CSV"), {
      target: { files: [csv("people-export.csv", peopleCsv)] },
    });
    fireEvent.change(screen.getByLabelText("Projects — CSV"), {
      target: { files: [csv("projects-broken.csv", projectsCsv)] },
    });
    fireEvent.change(screen.getByLabelText("Leave calendar — ICS"), {
      target: { files: [ics("leave-calendar.ics", calendarIcs)] },
    });

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => {
      expect(
        within(dialog).getByRole("button", { name: "Import data" }),
      ).toBeEnabled();
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Import data" }),
    );

    expect(await screen.findByText(/Alex Tuner/)).toBeVisible();
    expect(screen.getByText("Alex Turner")).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Projects — CSV"), {
      target: { files: [csv("projects-fixed.csv", projectsCsv)] },
    });
    await waitFor(() => {
      expect(
        within(dialog).getByRole("button", { name: "Import data" }),
      ).toBeEnabled();
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Import data" }),
    );

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByRole("heading", { name: "Import studio data" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Alex Turner")).toBeVisible();
  });
});
