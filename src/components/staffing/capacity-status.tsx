import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CapacityStatus } from "@/server/capacity/calculate-capacity";

const STATUS_APPEARANCE: Record<
  CapacityStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  available: {
    label: "Available",
    badgeClass:
      "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    dotClass: "bg-green-600",
  },
  at_capacity: {
    label: "At capacity",
    badgeClass:
      "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  overcommitted: {
    label: "Over capacity",
    badgeClass: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    dotClass: "bg-red-600",
  },
};

export function CapacityStatusBadge({ status }: { status: CapacityStatus }) {
  const { label, badgeClass, dotClass } = STATUS_APPEARANCE[status];

  return (
    <Badge className={cn("border-transparent font-medium", badgeClass)}>
      <span
        className={cn("size-1.5 shrink-0 rounded-full", dotClass)}
        aria-hidden="true"
      />
      {label}
    </Badge>
  );
}
