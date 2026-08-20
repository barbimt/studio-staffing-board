import { CAPACITY_STATUS_APPEARANCE } from "@/components/staffing/capacity-appearance";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { MonthlyPersonCapacity } from "@/server/capacity/calculate-capacity";

export function CapacitySummary({
  totalAllocation,
  contractualCapacityPercentage,
  remainingCapacity,
  status,
}: Pick<
  MonthlyPersonCapacity,
  | "totalAllocation"
  | "contractualCapacityPercentage"
  | "remainingCapacity"
  | "status"
>) {
  const { accentClass, textClass, remainingLabel } =
    CAPACITY_STATUS_APPEARANCE[status];
  const remaining = remainingLabel(remainingCapacity);
  const scale = Math.max(totalAllocation, contractualCapacityPercentage, 1);
  const fillPercent = (totalAllocation / scale) * 100;
  const capacityMarkPercent = (contractualCapacityPercentage / scale) * 100;
  const showCapacityMark = totalAllocation > contractualCapacityPercentage;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "text-sm font-medium",
            status === "overcommitted" && textClass,
          )}
        >
          {totalAllocation}% allocated
        </span>
        <span className="text-muted-foreground text-xs">
          {contractualCapacityPercentage}% capacity
        </span>
      </div>
      <Progress value={fillPercent} aria-hidden="true" className="w-full gap-0">
        <ProgressTrack className="h-1.5">
          <ProgressIndicator className={cn("transition-none", accentClass)} />
          {showCapacityMark ? (
            <span
              className="bg-background pointer-events-none absolute inset-y-0 w-0.5"
              style={{ left: `${capacityMarkPercent}%` }}
            />
          ) : null}
        </ProgressTrack>
      </Progress>
      {remaining ? (
        <span className={cn("text-xs", textClass)}>{remaining}</span>
      ) : null}
    </div>
  );
}
