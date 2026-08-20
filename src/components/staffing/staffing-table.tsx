"use client";

import { useTable } from "@tanstack/react-table";

import {
  staffingColumns,
  staffingTableFeatures,
} from "@/components/staffing/staffing-columns";
import type { MonthlyPersonCapacity } from "@/server/capacity/calculate-capacity";
import { formatMonthLabel } from "@/server/capacity/month";

export function StaffingTable({
  month,
  people,
}: {
  month: string;
  people: MonthlyPersonCapacity[];
}) {
  const table = useTable({
    features: staffingTableFeatures,
    columns: staffingColumns,
    data: people,
    getRowId: (row) => String(row.person.id),
  });

  return (
    <div className="mt-8 overflow-x-auto">
      <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          Monthly staffing for {formatMonthLabel(month)}
        </caption>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-border border-b">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className="text-muted-foreground px-3 py-2 font-medium"
                >
                  <table.FlexRender header={header} />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-border/80 border-b align-top">
              {row.getAllCells().map((cell) => (
                <td key={cell.id} className="px-3 py-3">
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
