import type { ReactNode } from "react";

import { staffingTableFrameClassName } from "@/components/staffing/staffing-table-chrome";

export function StaffingTableFrame({
  children,
  "aria-hidden": ariaHidden,
}: {
  children: ReactNode;
  "aria-hidden"?: boolean;
}) {
  return (
    <div className={staffingTableFrameClassName} aria-hidden={ariaHidden}>
      {children}
    </div>
  );
}
