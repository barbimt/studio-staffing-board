/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StaffingBoard } from "@/components/staffing/staffing-board";
import type { MonthlyPersonCapacity } from "@/server/capacity/calculate-capacity";

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
  it("renders people, role, site, projects, capacity, and status", () => {
    render(
      <StaffingBoard month="2026-09" hasStaffingData people={[person()]} />,
    );

    expect(
      screen.getByRole("heading", { name: "Studio Capacity" }),
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
    expect(screen.getByRole("button", { name: "Import data" })).toBeDisabled();
    expect(
      screen.queryByText("No people active in this month"),
    ).not.toBeInTheDocument();
  });

  it("shows an empty month without prompting for import", () => {
    render(<StaffingBoard month="2026-09" hasStaffingData people={[]} />);

    expect(screen.getByText("No people active in this month")).toBeVisible();
    expect(screen.queryByText("No staffing data yet")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Import data" }),
    ).not.toBeInTheDocument();
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
});
