import type { CapacityStatus } from "@/server/capacity/calculate-capacity";

export const CAPACITY_STATUS_APPEARANCE: Record<
  CapacityStatus,
  {
    badgeClass: string;
    accentClass: string;
    textClass?: string;
    statusLabel: (remaining: number) => string;
  }
> = {
  available: {
    badgeClass:
      "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    accentClass: "bg-green-600",
    textClass: "text-green-700 dark:text-green-300",
    statusLabel: (remaining) => `${remaining}% available`,
  },
  at_capacity: {
    badgeClass:
      "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    accentClass: "bg-amber-500",
    statusLabel: () => "At capacity",
  },
  overcommitted: {
    badgeClass: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    accentClass: "bg-red-600",
    textClass: "text-red-700 dark:text-red-300",
    statusLabel: (remaining) => `${Math.abs(remaining)}% over capacity`,
  },
};
