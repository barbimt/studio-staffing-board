import { ImportDataDialog } from "@/components/staffing/import-data-dialog";
import {
  staffingColumnDefaults,
  staffingColumnHeader,
  staffingColumnIds,
  staffingTableMinWidth,
} from "@/components/staffing/staffing-table-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMonthLabel } from "@/server/capacity/month";

export function StaffingEmptyState({
  month,
  variant,
}: {
  month: string;
  variant: "first-run" | "empty-month";
}) {
  const isFirstRun = variant === "first-run";

  return (
    <Card className="mt-8 gap-0 overflow-auto py-0">
      <table
        className="w-full table-fixed border-collapse text-left text-sm"
        style={{ minWidth: staffingTableMinWidth }}
      >
        <caption className="sr-only">
          Monthly staffing for {formatMonthLabel(month)}.{" "}
          {isFirstRun
            ? "No staffing data imported yet."
            : "No people active in this month."}
        </caption>
        <thead>
          <tr className="border-border border-b">
            {staffingColumnIds.map((id) => {
              const { size, enableResizing } = staffingColumnDefaults[id];

              return (
                <th
                  key={id}
                  scope="col"
                  className="text-muted-foreground border-border border-r p-0 text-xs font-medium tracking-wider uppercase last:border-r-0"
                  style={{
                    width: size,
                    maxWidth: enableResizing ? undefined : size,
                  }}
                >
                  <div className="px-4 py-3">{staffingColumnHeader[id]}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              colSpan={staffingColumnIds.length}
              className="px-6 py-16 text-center"
            >
              {isFirstRun ? (
                <div className="mx-auto max-w-md">
                  <h2 className="text-lg font-medium">No staffing data yet</h2>
                  <p className="text-muted-foreground mt-2">
                    Import the people CSV, projects CSV, and leave calendar to
                    build the monthly staffing board.
                  </p>
                  <div className="mt-4">
                    <ImportDataDialog
                      hasStaffingData={false}
                      trigger={<Button>Import data</Button>}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No people active in this month
                </p>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}
