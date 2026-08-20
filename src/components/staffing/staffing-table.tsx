"use client";

import { useTable, type Header } from "@tanstack/react-table";
import { useEffect, useRef, type KeyboardEvent } from "react";

import {
  staffingColumns,
  staffingTableFeatures,
} from "@/components/staffing/staffing-columns";
import {
  COLUMN_RESIZE_STEP,
  COLUMN_RESIZE_STEP_LARGE,
  nextColumnSize,
  readStaffingColumnSizing,
  writeStaffingColumnSizing,
} from "@/components/staffing/staffing-column-sizing";
import { staffingTableHeaderClassName } from "@/components/staffing/staffing-table-chrome";
import { StaffingTableFrame } from "@/components/staffing/staffing-table-frame";
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
  onSizeChange,
}: {
  header: Header<typeof staffingTableFeatures, MonthlyPersonCapacity, unknown>;
  onSizeChange: (columnId: string, size: number) => void;
}) {
  if (!header.column.getCanResize()) {
    return null;
  }

  const label = columnHeaderLabel(header);
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

    onSizeChange(
      header.column.id,
      nextColumnSize(header.column.getSize(), delta, minSize, maxSize),
    );
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
  const skipNextPersist = useRef(true);
  const didRestoreSizing = useRef(false);
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

  useEffect(() => {
    if (didRestoreSizing.current) {
      return;
    }

    didRestoreSizing.current = true;
    const stored = readStaffingColumnSizing();

    if (Object.keys(stored).length === 0) {
      return;
    }

    table.setColumnSizing(stored);
  }, [table]);

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }

    writeStaffingColumnSizing(table.state.columnSizing);
  }, [table.state.columnSizing]);

  return (
    <StaffingTableFrame>
      <table
        className="w-full table-fixed border-collapse text-left text-sm"
        style={{ minWidth: table.getTotalSize() }}
      >
        <caption className="sr-only">
          Monthly staffing for {formatMonthLabel(month)}. Drag a column edge or
          use arrow keys to resize. Double-click or Home resets a column.
        </caption>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-border border-b">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className={cn(staffingTableHeaderClassName, "relative")}
                  style={{ width: header.getSize() }}
                >
                  <table.FlexRender header={header} />
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
    </StaffingTableFrame>
  );
}
