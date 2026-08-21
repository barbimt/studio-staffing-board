"use client";

import { useTable, type Header } from "@tanstack/react-table";
import { useMemo, type KeyboardEvent } from "react";

import {
  createStaffingColumns,
  staffingTableFeatures,
} from "@/components/staffing/staffing-columns";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MonthlyPersonCapacity } from "@/server/capacity/calculate-capacity";
import { formatMonthLabel } from "@/server/capacity/month";

const COLUMN_RESIZE_STEP = 16;
const COLUMN_RESIZE_STEP_LARGE = 48;

function ColumnResizeHandle({
  header,
  onSizeChange,
}: {
  header: Header<typeof staffingTableFeatures, MonthlyPersonCapacity, unknown>;
  onSizeChange: (columnId: string, size: number) => void;
}) {
  if (!header.column.getCanResize()) {
    return null;
  }

  const label =
    typeof header.column.columnDef.header === "string"
      ? header.column.columnDef.header
      : header.column.id;
  const minSize = header.column.columnDef.minSize ?? 20;
  const maxSize = header.column.columnDef.maxSize ?? Number.MAX_SAFE_INTEGER;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Home") {
      event.preventDefault();
      header.column.resetSize();
      return;
    }

    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const step = event.shiftKey ? COLUMN_RESIZE_STEP_LARGE : COLUMN_RESIZE_STEP;
    const delta = event.key === "ArrowRight" ? step : -step;
    const next = header.column.getSize() + delta;

    onSizeChange(header.column.id, Math.min(maxSize, Math.max(minSize, next)));
  }

  return (
    <button
      type="button"
      aria-label={`Resize ${label} column`}
      className={cn(
        "absolute inset-y-0 right-0 z-10 w-6 cursor-col-resize touch-none border-0 bg-transparent p-0",
        "hover:bg-foreground/10",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-2",
        header.column.getIsResizing() && "bg-foreground/15",
      )}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      onDoubleClick={() => header.column.resetSize()}
      onKeyDown={handleKeyDown}
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
  const columns = useMemo(() => createStaffingColumns(month), [month]);
  const table = useTable(
    {
      features: staffingTableFeatures,
      columns,
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
    <Card className="mt-8 gap-0 overflow-auto py-0">
      <table
        className="w-full table-fixed border-collapse text-left text-sm"
        style={{ minWidth: table.getTotalSize() }}
      >
        <caption className="sr-only">
          Monthly staffing for {formatMonthLabel(month)}. Activate a person row
          to open their detail. Drag a column edge or use arrow keys to resize.
          Double-click or Home resets a column.
        </caption>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-border border-b">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className="text-muted-foreground border-border relative border-r p-0 text-xs font-medium tracking-wider uppercase last:border-r-0"
                  style={{
                    width: header.getSize(),
                    maxWidth: header.column.getCanResize()
                      ? undefined
                      : header.getSize(),
                  }}
                >
                  <div className="px-4 py-3">
                    <table.FlexRender header={header} />
                  </div>
                  <ColumnResizeHandle
                    header={header}
                    onSizeChange={(columnId, size) => {
                      table.setColumnSizing((current) => ({
                        ...current,
                        [columnId]: size,
                      }));
                    }}
                  />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-border/80 hover:bg-muted/50 relative border-b align-middle last:border-b-0"
            >
              {row.getAllCells().map((cell) => (
                <td
                  key={cell.id}
                  className="p-0"
                  style={{
                    width: cell.column.getSize(),
                    maxWidth: cell.column.getCanResize()
                      ? undefined
                      : cell.column.getSize(),
                  }}
                >
                  <div className="px-4 py-3.5">
                    <div className="min-w-0 overflow-hidden">
                      <table.FlexRender cell={cell} />
                    </div>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
