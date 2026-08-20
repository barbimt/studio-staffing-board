import {
  staffingColumnHeaders,
  staffingTableHeaderClassName,
} from "@/components/staffing/staffing-table-chrome";
import { StaffingTableFrame } from "@/components/staffing/staffing-table-frame";

export function StaffingTableSkeleton() {
  const rows = Array.from({ length: 8 }, (_, index) => index);

  return (
    <StaffingTableFrame aria-hidden>
      <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-border border-b">
            {staffingColumnHeaders.map((header) => (
              <th
                key={header}
                scope="col"
                className={staffingTableHeaderClassName}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row} className="border-border/80 border-b last:border-b-0">
              {staffingColumnHeaders.map((header) => (
                <td key={header} className="px-4 py-3.5">
                  <span className="bg-muted block h-4 w-24 rounded-sm motion-safe:animate-pulse" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </StaffingTableFrame>
  );
}
