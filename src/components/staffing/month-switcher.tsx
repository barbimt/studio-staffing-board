import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatMonthLabel,
  shiftYearMonth,
  staffingMonthHref,
} from "@/server/capacity/month";

export function MonthSwitcher({ month }: { month: string }) {
  const label = formatMonthLabel(month);
  const previousMonth = shiftYearMonth(month, -1);
  const nextMonth = shiftYearMonth(month, 1);

  return (
    <nav
      aria-label="Selected month"
      className="text-foreground flex items-center gap-3"
    >
      <Link
        href={staffingMonthHref(previousMonth)}
        aria-label="Previous month"
        className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }))}
      >
        <ChevronLeft aria-hidden="true" />
      </Link>
      <p
        className="min-w-40 text-center text-base font-medium tabular-nums"
        aria-live="polite"
      >
        {label}
      </p>
      <Link
        href={staffingMonthHref(nextMonth)}
        aria-label="Next month"
        className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }))}
      >
        <ChevronRight aria-hidden="true" />
      </Link>
    </nav>
  );
}
