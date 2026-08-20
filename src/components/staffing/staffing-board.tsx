import { MonthSwitcher } from "@/components/staffing/month-switcher";
import { StaffingEmptyState } from "@/components/staffing/staffing-empty-state";
import { StaffingTable } from "@/components/staffing/staffing-table";
import type { MonthlyPersonCapacity } from "@/server/capacity/calculate-capacity";

export function StaffingBoard({
  month,
  hasStaffingData,
  people,
}: {
  month: string;
  hasStaffingData: boolean;
  people: MonthlyPersonCapacity[];
}) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Studio Capacity
        </h1>
        <p className="text-muted-foreground mt-1">
          Can this person take on more work this month?
        </p>
        <MonthSwitcher month={month} />
      </header>
      {!hasStaffingData ? (
        <StaffingEmptyState variant="first-run" />
      ) : people.length === 0 ? (
        <StaffingEmptyState variant="empty-month" />
      ) : (
        <StaffingTable month={month} people={people} />
      )}
    </main>
  );
}
