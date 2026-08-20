import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CapacityStatus } from "@/server/capacity/calculate-capacity";

const STATUS_LABEL: Record<CapacityStatus, string> = {
  available: "Available",
  at_capacity: "At capacity",
  overcommitted: "Over capacity",
};

const STATUS_BADGE_CLASS: Record<CapacityStatus, string> = {
  available: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  at_capacity:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  overcommitted: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const STATUS_DOT_CLASS: Record<CapacityStatus, string> = {
  available: "bg-green-600",
  at_capacity: "bg-amber-500",
  overcommitted: "bg-red-600",
};

export function CapacityStatusBadge({ status }: { status: CapacityStatus }) {
  return (
    <Badge
      className={cn(
        "border-transparent font-medium",
        STATUS_BADGE_CLASS[status],
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          STATUS_DOT_CLASS[status],
        )}
        aria-hidden="true"
      />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
