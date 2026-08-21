import { CAPACITY_STATUS_APPEARANCE } from "@/components/staffing/capacity-appearance";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CapacityStatus } from "@/server/capacity/calculate-capacity";

export function CapacityStatusBadge({
  status,
  remainingCapacityPercentage,
}: {
  status: CapacityStatus;
  remainingCapacityPercentage: number;
}) {
  const { statusLabel, badgeClass, accentClass } =
    CAPACITY_STATUS_APPEARANCE[status];

  return (
    <Badge className={cn("border-transparent font-medium", badgeClass)}>
      <span
        className={cn("size-1.5 shrink-0 rounded-full", accentClass)}
        aria-hidden="true"
      />
      {statusLabel(remainingCapacityPercentage)}
    </Badge>
  );
}
