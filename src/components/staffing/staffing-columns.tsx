import {
  columnResizingFeature,
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
} from "@tanstack/react-table";

import { CapacityStatusBadge } from "@/components/staffing/capacity-status";
import { CapacitySummary } from "@/components/staffing/capacity-summary";
import { ProjectList } from "@/components/staffing/project-list";
import { staffingColumnHeader } from "@/components/staffing/staffing-table-chrome";
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
      size: 260,
      minSize: 180,
      enableResizing: false,
      cell: ({ row }) => {
        const { firstName, lastName, jobTitle } = row.original.person;
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;

        return (
          <div className="flex items-center gap-3">
            <span
              className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium"
              aria-hidden="true"
            >
              {initials}
            </span>
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
    size: 120,
    minSize: 80,
    enableResizing: false,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue()}</span>
    ),
  }),
  columnHelper.accessor("projects", {
    header: staffingColumnHeader.projects,
    size: 280,
    minSize: 140,
    cell: ({ getValue }) => <ProjectList projects={getValue()} />,
  }),
  columnHelper.display({
    id: "capacity",
    header: staffingColumnHeader.capacity,
    size: 200,
    minSize: 150,
    cell: ({ row }) => (
      <CapacitySummary
        totalAllocation={row.original.totalAllocation}
        contractualCapacityPercentage={
          row.original.contractualCapacityPercentage
        }
        remainingCapacity={row.original.remainingCapacity}
        fte={row.original.person.fte}
      />
    ),
  }),
  columnHelper.accessor("status", {
    header: staffingColumnHeader.status,
    size: 160,
    minSize: 130,
    enableResizing: false,
    cell: ({ getValue }) => <CapacityStatusBadge status={getValue()} />,
  }),
]);
