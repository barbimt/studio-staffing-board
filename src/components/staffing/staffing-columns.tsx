import {
  columnResizingFeature,
  columnSizingFeature,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  type SortFn,
} from "@tanstack/react-table";
import Link from "next/link";

import { CapacityStatusBadge } from "@/components/staffing/capacity-status-badge";
import { CapacitySummary } from "@/components/staffing/capacity-summary";
import { ProjectList } from "@/components/staffing/project-list";
import {
  staffingColumnDefaults,
  staffingColumnHeader,
} from "@/components/staffing/staffing-table-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { MonthlyPersonCapacity } from "@/server/capacity/calculate-capacity";
import { personDetailHref } from "@/server/capacity/month";

export const staffingTableFeatures = tableFeatures({
  columnSizingFeature,
  columnResizingFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<
  typeof staffingTableFeatures,
  MonthlyPersonCapacity
>();

const sortByFirstNameThenLastName: SortFn<
  typeof staffingTableFeatures,
  MonthlyPersonCapacity
> = (rowA, rowB) => {
  const first = rowA.original.person.firstName.localeCompare(
    rowB.original.person.firstName,
  );
  if (first !== 0) {
    return first;
  }

  return rowA.original.person.lastName.localeCompare(
    rowB.original.person.lastName,
  );
};

export function createStaffingColumns(month: string) {
  return columnHelper.columns([
    columnHelper.accessor(
      (row) => `${row.person.firstName} ${row.person.lastName}`,
      {
        id: "person",
        header: staffingColumnHeader.person,
        ...staffingColumnDefaults.person,
        sortFn: sortByFirstNameThenLastName,
        sortDescFirst: true,
        cell: ({ row }) => {
          const { id, firstName, lastName, jobTitle } = row.original.person;
          const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;

          return (
            <div className="flex items-center gap-3">
              <Avatar aria-hidden="true">
                <AvatarFallback className="text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-0.5">
                <Link
                  href={personDetailHref(id, month)}
                  className="text-foreground focus-visible:ring-ring/50 font-medium after:absolute after:inset-0 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                >
                  {firstName} {lastName}
                </Link>
                <span className="text-muted-foreground text-xs">
                  {jobTitle}
                </span>
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
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue()}</span>
      ),
    }),
    columnHelper.accessor("projects", {
      header: staffingColumnHeader.projects,
      ...staffingColumnDefaults.projects,
      enableSorting: false,
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
      enableSorting: false,
      cell: ({ row }) => (
        <CapacityStatusBadge
          status={row.original.status}
          remainingCapacityPercentage={row.original.remainingCapacityPercentage}
        />
      ),
    }),
  ]);
}
