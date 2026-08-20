import { CalendarOff } from "lucide-react";

import { CAPACITY_STATUS_APPEARANCE } from "@/components/staffing/capacity-appearance";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { MonthlyPersonCapacity } from "@/server/capacity/calculate-capacity";

export function CapacitySummary({
  totalAllocationPercentage,
  effectiveCapacityPercentage,
  unavailableWeekdays,
  status,
}: Pick<
  MonthlyPersonCapacity,
  | "totalAllocationPercentage"
  | "effectiveCapacityPercentage"
  | "unavailableWeekdays"
  | "status"
>) {
  const { accentClass, textClass } = CAPACITY_STATUS_APPEARANCE[status];
  const scale = Math.max(
    totalAllocationPercentage,
    effectiveCapacityPercentage,
    1,
  );
  const fillPercent = (totalAllocationPercentage / scale) * 100;
  const capacityMarkPercent = (effectiveCapacityPercentage / scale) * 100;
  const showCapacityMark =
    totalAllocationPercentage > effectiveCapacityPercentage;
  const showReduction = unavailableWeekdays > 0;
  const unavailableLabel =
    unavailableWeekdays === 1
      ? "1 day unavailable"
      : `${unavailableWeekdays} days unavailable`;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "text-sm font-medium",
            status === "overcommitted" && textClass,
          )}
        >
          {totalAllocationPercentage}% allocated
        </span>
        <span className="text-muted-foreground text-xs">
          {effectiveCapacityPercentage}% capacity
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
      {showReduction ? (
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <CalendarOff className="size-3 shrink-0" aria-hidden="true" />
          {unavailableLabel}
        </span>
      ) : null}
    </div>
  );
}
