import { createColumnHelper, tableFeatures } from "@tanstack/react-table";

import { CapacityStatusBadge } from "@/components/staffing/capacity-status";
import { CapacitySummary } from "@/components/staffing/capacity-summary";
import { ProjectList } from "@/components/staffing/project-list";
import type { MonthlyPersonCapacity } from "@/server/capacity/calculate-capacity";

export const staffingTableFeatures = tableFeatures({});

const columnHelper = createColumnHelper<
  typeof staffingTableFeatures,
  MonthlyPersonCapacity
>();

export const staffingColumns = columnHelper.columns([
  columnHelper.accessor(
    (row) => `${row.person.firstName} ${row.person.lastName}`,
    {
      id: "person",
      header: "Person",
      cell: ({ row }) => {
        const { firstName, lastName, jobTitle } = row.original.person;

        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground font-medium">
              {firstName} {lastName}
            </span>
            <span className="text-muted-foreground">{jobTitle}</span>
          </div>
        );
      },
    },
  ),
  columnHelper.accessor((row) => row.person.site, {
    id: "site",
    header: "Site",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue()}</span>
    ),
  }),
  columnHelper.accessor("projects", {
    header: "Projects",
    cell: ({ getValue }) => <ProjectList projects={getValue()} />,
  }),
  columnHelper.display({
    id: "capacity",
    header: "Capacity",
    cell: ({ row }) => (
      <CapacitySummary
        totalAllocation={row.original.totalAllocation}
        contractualCapacityPercentage={
          row.original.contractualCapacityPercentage
        }
        remainingCapacity={row.original.remainingCapacity}
      />
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => <CapacityStatusBadge status={getValue()} />,
  }),
]);
