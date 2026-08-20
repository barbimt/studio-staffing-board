import { ImportDataDialog } from "@/components/staffing/import-data-dialog";
import { Button } from "@/components/ui/button";

export function StaffingEmptyState({
  variant,
}: {
  variant: "first-run" | "empty-month";
}) {
  if (variant === "empty-month") {
    return (
      <p className="text-muted-foreground mt-10">
        No people active in this month
      </p>
    );
  }

  return (
    <div className="mt-10 max-w-md">
      <h2 className="text-lg font-medium">No staffing data yet</h2>
      <p className="text-muted-foreground mt-2">
        Import the people CSV, projects CSV, and leave calendar to build the
        monthly staffing board.
      </p>
      <div className="mt-4">
        <ImportDataDialog
          hasStaffingData={false}
          trigger={<Button>Import data</Button>}
        />
      </div>
    </div>
  );
}
