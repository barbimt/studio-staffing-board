/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PersonMonthTimeOff } from "@/components/people/person-month-time-off";

describe("PersonMonthTimeOff", () => {
  it("lists leave ranges and holiday days in text", () => {
    render(
      <PersonMonthTimeOff
        month="2026-09"
        timeOff={{
          leave: [
            {
              id: 1,
              label: "Annual Leave",
              startDate: "2026-09-21",
              endDate: "2026-09-25",
            },
          ],
          holidays: [{ id: 2, label: "Portugal holiday", date: "2026-09-07" }],
        }}
      />,
    );

    expect(screen.getByText("Leave")).toBeVisible();
    expect(screen.getByText("Public holiday")).toBeVisible();
    expect(screen.getByText("Annual Leave")).toBeVisible();
    expect(
      screen.getByText(/from 21 Sept? – 24 Sept? \(4 days\)/),
    ).toBeVisible();
    expect(screen.getByText("Portugal holiday")).toBeVisible();
    expect(screen.getByText(/on 7 Sept?/)).toBeVisible();
    expect(screen.queryByText(/North Star/)).not.toBeInTheDocument();
  });

  it("phrases a single-day leave as on that day", () => {
    render(
      <PersonMonthTimeOff
        month="2026-08"
        timeOff={{
          leave: [
            {
              id: 3,
              label: "Annual Leave",
              startDate: "2026-08-14",
              endDate: "2026-08-15",
            },
          ],
          holidays: [],
        }}
      />,
    );

    expect(screen.getByText("Annual Leave")).toBeVisible();
    expect(screen.getByText(/on 14 Aug \(1 day\)/)).toBeVisible();
    expect(screen.queryByText(/from /)).not.toBeInTheDocument();
  });

  it("says when the month has no time off", () => {
    render(
      <PersonMonthTimeOff
        month="2026-09"
        timeOff={{ leave: [], holidays: [] }}
      />,
    );

    expect(
      screen.getByText(
        "No leave or applicable public holidays in September 2026.",
      ),
    ).toBeVisible();
  });
});
