import { cn } from "@/lib/utils";
import type { CapacityStatus } from "@/server/capacity/calculate-capacity";

const STATUS_LABEL: Record<CapacityStatus, string> = {
  available: "Available",
  at_capacity: "At capacity",
  overcommitted: "Over capacity",
};

const STATUS_CLASS: Record<CapacityStatus, string> = {
  available: "text-status-available",
  at_capacity: "text-status-at-capacity",
  overcommitted: "text-status-over-capacity",
};

export function CapacityStatusBadge({ status }: { status: CapacityStatus }) {
  return (
    <span className={cn("font-medium", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}
