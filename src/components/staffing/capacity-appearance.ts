import type { CapacityStatus } from "@/server/capacity/calculate-capacity";

export const CAPACITY_STATUS_APPEARANCE: Record<
  CapacityStatus,
  {
    label: string;
    badgeClass: string;
    accentClass: string;
    textClass?: string;
    remainingLabel: (remaining: number) => string | null;
  }
> = {
  available: {
    label: "Available",
    badgeClass:
      "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    accentClass: "bg-green-600",
    textClass: "text-green-700 dark:text-green-300",
    remainingLabel: (remaining) => `${remaining}% available`,
  },
  at_capacity: {
    label: "At capacity",
    badgeClass:
      "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    accentClass: "bg-amber-500",
    remainingLabel: () => null,
  },
  overcommitted: {
    label: "Over capacity",
    badgeClass: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    accentClass: "bg-red-600",
    textClass: "text-red-700 dark:text-red-300",
    remainingLabel: (remaining) => `${Math.abs(remaining)}% over`,
  },
};
