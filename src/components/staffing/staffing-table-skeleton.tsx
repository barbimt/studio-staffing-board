import { Card } from "@/components/ui/card";
import {
  staffingColumnDefaults,
  staffingColumnHeader,
  staffingColumnIds,
  staffingTableMinWidth,
} from "@/components/staffing/staffing-table-layout";

export function StaffingTableSkeleton() {
  const rows = Array.from({ length: 8 }, (_, index) => index);

  return (
    <Card aria-hidden className="mt-8 gap-0 overflow-auto py-0">
      <table
        className="w-full table-fixed border-collapse text-left text-sm"
        style={{ minWidth: staffingTableMinWidth }}
      >
        <thead>
          <tr className="border-border border-b">
            {staffingColumnIds.map((id) => {
              const { size, enableResizing } = staffingColumnDefaults[id];

              return (
                <th
                  key={id}
                  scope="col"
                  className="text-muted-foreground border-border border-r p-0 text-xs font-medium tracking-wider uppercase last:border-r-0"
                  style={{
                    width: size,
                    maxWidth: enableResizing ? undefined : size,
                  }}
                >
                  <div className="px-4 py-3">{staffingColumnHeader[id]}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row} className="border-border/80 border-b last:border-b-0">
              {staffingColumnIds.map((id) => {
                const { size, enableResizing } = staffingColumnDefaults[id];

                return (
                  <td
                    key={id}
                    className="p-0"
                    style={{
                      width: size,
                      maxWidth: enableResizing ? undefined : size,
                    }}
                  >
                    <div className="px-4 py-3.5">
                      <div className="min-w-0 overflow-hidden">
                        <span className="bg-muted block h-4 w-24 rounded-sm motion-safe:animate-pulse" />
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
