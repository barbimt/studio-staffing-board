/** @vitest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PersonDetailView } from "@/components/people/person-detail";
import type { PersonDetail } from "@/server/capacity/get-person-detail";

vi.mock("@/app/people/[personId]/actions", () => ({
  updateAllocationAction: async () => ({}),
}));

function detail(overrides: Partial<PersonDetail> = {}): PersonDetail {
  return {
    person: {
      id: 3,
      employeeId: "E003",
      firstName: "Maria",
      lastName: "Costa",
      jobTitle: "Senior Artist",
      department: "Art",
      site: "Porto",
      fte: 0.8,
      startDate: "2022-01-01",
      endDate: null,
    },
    employedInSelectedMonth: true,
    selectedMonth: "2026-09",
    holidayRegion: "PT",
    month: {
      person: {
        id: 3,
        employeeId: "E003",
        firstName: "Maria",
        lastName: "Costa",
        jobTitle: "Senior Artist",
        site: "Porto",
        fte: 0.8,
      },
      projects: [{ id: 30, name: "Open House", allocationPercentage: 70 }],
      contractualCapacityPercentage: 80,
      effectiveCapacityPercentage: 61.82,
      totalAllocationPercentage: 70,
      remainingCapacityPercentage: -8.18,
      unavailableWeekdays: 5,
      leaveWeekdays: 4,
      holidayWeekdays: 1,
      overlappingWeekdays: 0,
      workingDayCount: 22,
      status: "overcommitted",
    },
    assignments: [
      {
        assignmentId: 9,
        projectId: 30,
        name: "Open House",
        client: "Open House",
        status: "Active",
        startDate: "2026-09-07",
        endDate: "2026-12-18",
        allocationPercentage: 70,
        activeInSelectedMonth: true,
        overlapsSelectedYear: true,
      },
    ],
    timeOff: {
      leave: [],
      holidays: [],
    },
    ...overrides,
  };
}

describe("PersonDetailView", () => {
  it("renders identity, month, and percentage capacity breakdown", () => {
    render(<PersonDetailView detail={detail()} />);

    expect(screen.getByRole("heading", { name: "Maria Costa" })).toBeVisible();
    expect(screen.getByText(/Senior Artist/)).toBeVisible();
    expect(screen.getByText(/Porto/)).toBeVisible();
    expect(screen.getByText(/0.8 FTE/)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Staffing board" }),
    ).toHaveAttribute("href", "/?month=2026-09");
    expect(
      screen.getByRole("link", { name: "Previous month" }),
    ).toHaveAttribute("href", "/people/3?month=2026-08");
    expect(screen.getByText("80%")).toBeVisible();
    expect(screen.getByText("61.82%")).toBeVisible();
    expect(screen.getAllByText("70%").length).toBeGreaterThan(0);
    expect(screen.getByText("8.18%")).toBeVisible();
    expect(screen.queryByText(/128h/)).not.toBeInTheDocument();
    expect(screen.getByText(/4 leave weekday/)).toBeVisible();
    expect(screen.getByText(/1 public holiday weekday/)).toBeVisible();
    expect(screen.getByText(/Open House · 7 Sept – 18 Dec/)).toBeVisible();
    expect(screen.queryByText(/Not active in/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled();
  });

  it("disables edit when the project ended before the selected month", () => {
    render(
      <PersonDetailView
        detail={detail({
          selectedMonth: "2026-11",
          assignments: [
            {
              assignmentId: 9,
              projectId: 30,
              name: "Open House",
              client: "Open House",
              status: "Active",
              startDate: "2026-09-07",
              endDate: "2026-10-18",
              allocationPercentage: 70,
              activeInSelectedMonth: false,
              overlapsSelectedYear: true,
            },
          ],
        })}
      />,
    );

    expect(screen.getByText(/7 Sept – 18 Oct/)).toBeVisible();
    expect(screen.getByText("Not active in Nov")).toBeVisible();
    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
  });

  it("previews allocation with the status pill instead of help copy", () => {
    render(<PersonDetailView detail={detail()} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const dialog = screen.getByRole("dialog", { name: "Edit allocation" });

    expect(
      within(dialog).getByText(
        "70% allocated against 61.82% effective capacity in September 2026.",
      ),
    ).toBeVisible();
    expect(within(dialog).getByText("8.18% over capacity")).toBeVisible();
    expect(
      within(dialog).queryByText(/0% keeps the assignment/),
    ).not.toBeInTheDocument();
  });

  it("keeps 0% assignments visible", () => {
    render(
      <PersonDetailView
        detail={detail({
          assignments: [
            {
              assignmentId: 9,
              projectId: 30,
              name: "Open House",
              client: "Open House",
              status: "Active",
              startDate: "2026-09-07",
              endDate: "2026-12-18",
              allocationPercentage: 0,
              activeInSelectedMonth: true,
              overlapsSelectedYear: true,
            },
          ],
          month: {
            ...detail().month,
            projects: [{ id: 30, name: "Open House", allocationPercentage: 0 }],
            totalAllocationPercentage: 0,
            remainingCapacityPercentage: 61.82,
            status: "available",
          },
        })}
      />,
    );

    expect(screen.getByText("Open House")).toBeVisible();
    expect(screen.getAllByText("0%").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Edit" })).toBeVisible();
  });
});
