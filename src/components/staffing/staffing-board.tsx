import { Import } from "lucide-react";

import { ImportDataDialog } from "@/components/staffing/import-data-dialog";
import { MonthSwitcher } from "@/components/staffing/month-switcher";
import { StaffingEmptyState } from "@/components/staffing/staffing-empty-state";
import { StaffingTable } from "@/components/staffing/staffing-table";
import { Button } from "@/components/ui/button";
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
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <MonthSwitcher month={month} />
          {hasStaffingData ? (
            <ImportDataDialog
              hasStaffingData
              trigger={
                <Button variant="outline" size="lg">
                  <Import aria-hidden="true" data-icon="inline-start" />
                  Import data
                </Button>
              }
            />
          ) : null}
        </div>
      </header>
      {!hasStaffingData ? (
        <StaffingEmptyState month={month} variant="first-run" />
      ) : people.length === 0 ? (
        <StaffingEmptyState month={month} variant="empty-month" />
      ) : (
        <StaffingTable month={month} people={people} />
      )}
    </main>
  );
}
