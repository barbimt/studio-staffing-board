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
        Import the studio data files to build the monthly staffing board. File
        upload is not available in this version.
      </p>
      <Button className="mt-4" disabled>
        Import data
      </Button>
    </div>
  );
}
