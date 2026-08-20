import {
  columnResizingFeature,
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
} from "@tanstack/react-table";

import { CAPACITY_STATUS_APPEARANCE } from "@/components/staffing/capacity-appearance";
import { CapacitySummary } from "@/components/staffing/capacity-summary";
import { ProjectList } from "@/components/staffing/project-list";
import {
  staffingColumnDefaults,
  staffingColumnHeader,
} from "@/components/staffing/staffing-table-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MonthlyPersonCapacity } from "@/server/capacity/calculate-capacity";

export const staffingTableFeatures = tableFeatures({
  columnSizingFeature,
  columnResizingFeature,
});

const columnHelper = createColumnHelper<
  typeof staffingTableFeatures,
  MonthlyPersonCapacity
>();

export const staffingColumns = columnHelper.columns([
  columnHelper.accessor(
    (row) => `${row.person.firstName} ${row.person.lastName}`,
    {
      id: "person",
      header: staffingColumnHeader.person,
      ...staffingColumnDefaults.person,
      cell: ({ row }) => {
        const { firstName, lastName, jobTitle } = row.original.person;
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;

        return (
          <div className="flex items-center gap-3">
            <Avatar aria-hidden="true">
              <AvatarFallback className="text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-foreground font-medium">
                {firstName} {lastName}
              </span>
              <span className="text-muted-foreground text-xs">{jobTitle}</span>
            </div>
          </div>
        );
      },
    },
  ),
  columnHelper.accessor((row) => row.person.site, {
    id: "site",
    header: staffingColumnHeader.site,
    ...staffingColumnDefaults.site,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue()}</span>
    ),
  }),
  columnHelper.accessor("projects", {
    header: staffingColumnHeader.projects,
    ...staffingColumnDefaults.projects,
    cell: ({ getValue }) => <ProjectList projects={getValue()} />,
  }),
  columnHelper.display({
    id: "capacity",
    header: staffingColumnHeader.capacity,
    ...staffingColumnDefaults.capacity,
    cell: ({ row }) => (
      <CapacitySummary
        totalAllocationPercentage={row.original.totalAllocationPercentage}
        effectiveCapacityPercentage={row.original.effectiveCapacityPercentage}
        unavailableWeekdays={row.original.unavailableWeekdays}
        status={row.original.status}
      />
    ),
  }),
  columnHelper.accessor("status", {
    header: staffingColumnHeader.status,
    ...staffingColumnDefaults.status,
    cell: ({ row }) => {
      const { status, remainingCapacityPercentage } = row.original;
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
    },
  }),
]);
