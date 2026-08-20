"use client";

import { useTable, type Header } from "@tanstack/react-table";

import {
  staffingColumns,
  staffingTableFeatures,
} from "@/components/staffing/staffing-columns";
import { cn } from "@/lib/utils";
import type { MonthlyPersonCapacity } from "@/server/capacity/calculate-capacity";
import { formatMonthLabel } from "@/server/capacity/month";

function columnHeaderLabel(
  header: Header<typeof staffingTableFeatures, MonthlyPersonCapacity, unknown>,
): string {
  const { header: headerDef } = header.column.columnDef;

  return typeof headerDef === "string" ? headerDef : header.column.id;
}

function ColumnResizeHandle({
  header,
}: {
  header: Header<typeof staffingTableFeatures, MonthlyPersonCapacity, unknown>;
}) {
  if (!header.column.getCanResize()) {
    return null;
  }

  const label = columnHeaderLabel(header);

  return (
    <button
      type="button"
      aria-label={`Resize ${label} column`}
      className={cn(
        "absolute inset-y-0 right-0 z-10 w-3 cursor-col-resize touch-none border-0 bg-transparent p-0",
        "hover:bg-foreground/10",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-2",
        header.column.getIsResizing() && "bg-foreground/15",
      )}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      onDoubleClick={() => header.column.resetSize()}
    />
  );
}

export function StaffingTable({
  month,
  people,
}: {
  month: string;
  people: MonthlyPersonCapacity[];
}) {
  const table = useTable(
    {
      features: staffingTableFeatures,
      columns: staffingColumns,
      data: people,
      getRowId: (row) => String(row.person.id),
      columnResizeMode: "onChange",
    },
    (state) => ({
      columnSizing: state.columnSizing,
      columnResizing: state.columnResizing,
    }),
  );

  return (
    <div className="border-border bg-background mt-8 overflow-x-auto rounded-xl border">
      <table
        className="w-full table-fixed border-collapse text-left text-sm"
        style={{ minWidth: table.getTotalSize() }}
      >
        <caption className="sr-only">
          Monthly staffing for {formatMonthLabel(month)}. Drag a column edge to
          resize. Double-click an edge to reset.
        </caption>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-border border-b">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className="text-muted-foreground border-border relative border-r px-4 py-3 text-[11px] font-medium tracking-wider uppercase last:border-r-0"
                  style={{ width: header.getSize() }}
                >
                  <table.FlexRender header={header} />
                  <ColumnResizeHandle header={header} />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-border/80 border-b align-middle last:border-b-0"
            >
              {row.getAllCells().map((cell) => (
                <td
                  key={cell.id}
                  className="overflow-hidden px-4 py-3.5"
                  style={{ width: cell.column.getSize() }}
                >
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
