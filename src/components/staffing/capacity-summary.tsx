import { cn } from "@/lib/utils";
import type { MonthlyPersonCapacity } from "@/server/capacity/calculate-capacity";

function remainingCopy(remainingCapacity: number): string {
  if (remainingCapacity < 0) {
    return `${Math.abs(remainingCapacity)}% over`;
  }

  return `${remainingCapacity}% available`;
}

export function CapacitySummary({
  totalAllocation,
  contractualCapacityPercentage,
  remainingCapacity,
  fte,
}: Pick<
  MonthlyPersonCapacity,
  "totalAllocation" | "contractualCapacityPercentage" | "remainingCapacity"
> & {
  fte: number;
}) {
  const remaining = remainingCopy(remainingCapacity);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-foreground font-medium">
        {totalAllocation}% allocated
      </span>
      <p className="text-muted-foreground text-xs">
        <span>{contractualCapacityPercentage}% capacity</span>
        <span aria-hidden="true"> · </span>
        <span
          className={cn(
            remainingCapacity < 0 && "text-red-700 dark:text-red-300",
            remainingCapacity > 0 && "text-green-700 dark:text-green-300",
            remainingCapacity === 0 && "text-muted-foreground",
          )}
        >
          {remaining}
        </span>
      </p>
      <span className="text-muted-foreground text-xs">
        {fte.toFixed(1)} FTE
      </span>
    </div>
  );
}
