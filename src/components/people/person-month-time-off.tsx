import { CalendarDays } from "lucide-react";

import {
  addUtcDays,
  formatDayMonth,
  formatInclusiveDateRange,
  inclusiveDayCount,
  isoDayOfMonth,
  isWeekendIso,
} from "@/lib/format-staffing-dates";
import { cn } from "@/lib/utils";
import type { PersonTimeOff } from "@/server/capacity/get-person-detail";
import { formatMonthLabel, parseYearMonth } from "@/server/capacity/month";

const leaveSwatchClassName =
  "bg-muted-foreground/40 border-muted-foreground/60 inline-block h-2.5 w-6 shrink-0 rounded-sm border";

export function PersonMonthTimeOff({
  month,
  timeOff,
}: {
  month: string;
  timeOff: PersonTimeOff;
}) {
  const yearMonth = parseYearMonth(month);
  const daysInMonth = isoDayOfMonth(yearMonth.monthEnd);
  const monthLabel = formatMonthLabel(month);
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = `${yearMonth.monthStart.slice(0, 8)}${String(index + 1).padStart(2, "0")}`;

    return { day: index + 1, date, weekend: isWeekendIso(date) };
  });

  const hasTimeOff = timeOff.leave.length > 0 || timeOff.holidays.length > 0;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-2">
          <span className={leaveSwatchClassName} aria-hidden="true" />
          Leave
        </span>
        <span className="flex items-center gap-2">
          <CalendarDays
            className="text-muted-foreground size-3.5"
            aria-hidden="true"
          />
          Public holiday
        </span>
      </div>

      {hasTimeOff ? (
        <figure className="max-w-full overflow-x-auto pb-2">
          <div
            className="grid min-w-full"
            style={{
              gridTemplateColumns: `repeat(${daysInMonth}, minmax(1.75rem, 1fr))`,
            }}
            aria-hidden="true"
          >
            {days.map((day) => (
              <span
                key={day.date}
                className={cn(
                  "text-center text-[0.65rem] tabular-nums",
                  day.weekend
                    ? "text-muted-foreground/50"
                    : "text-muted-foreground",
                )}
              >
                {day.day}
              </span>
            ))}
            <div className="relative col-span-full h-10">
              <div className="bg-border absolute inset-x-0 top-1/2 h-px -translate-y-1/2" />
              {timeOff.leave.map((entry) => {
                const startDay = isoDayOfMonth(entry.startDate);
                const endDay = isoDayOfMonth(addUtcDays(entry.endDate, -1));

                return (
                  <div
                    key={`leave-${entry.id}`}
                    className="bg-muted-foreground/40 border-muted-foreground/60 absolute top-1/2 h-3 -translate-y-1/2 rounded-sm border"
                    style={{
                      left: `${((startDay - 1) / daysInMonth) * 100}%`,
                      width: `${((endDay - startDay + 1) / daysInMonth) * 100}%`,
                    }}
                  />
                );
              })}
              {timeOff.holidays.map((entry) => {
                const day = isoDayOfMonth(entry.date);

                return (
                  <span
                    key={`holiday-${entry.id}`}
                    className="bg-background text-muted-foreground absolute top-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border"
                    style={{
                      left: `${((day - 0.5) / daysInMonth) * 100}%`,
                    }}
                  >
                    <CalendarDays className="size-3" />
                  </span>
                );
              })}
            </div>
          </div>
          <figcaption className="sr-only">
            Time off in {monthLabel}. Leave is a bar across its days. Public
            holidays are calendar markers on a single day. Dates are listed
            below.
          </figcaption>
        </figure>
      ) : (
        <p className="text-muted-foreground text-sm">
          No leave or applicable public holidays in {monthLabel}.
        </p>
      )}

      {hasTimeOff ? (
        <ul className="grid gap-1.5 text-sm">
          {timeOff.leave.map((entry) => {
            const dayCount = inclusiveDayCount(entry.startDate, entry.endDate, {
              exclusiveEnd: true,
            });
            const range = formatInclusiveDateRange(
              entry.startDate,
              entry.endDate,
              { exclusiveEnd: true },
            );

            return (
              <li key={`leave-summary-${entry.id}`} className="flex gap-2">
                <span
                  className={cn(leaveSwatchClassName, "mt-1.5")}
                  aria-hidden="true"
                />
                <span>
                  <span className="font-medium">{entry.label}</span>
                  <span className="text-muted-foreground">
                    {dayCount === 1 ? " on " : " from "}
                    {range} ({dayCount} {dayCount === 1 ? "day" : "days"})
                  </span>
                </span>
              </li>
            );
          })}
          {timeOff.holidays.map((entry) => (
            <li key={`holiday-summary-${entry.id}`} className="flex gap-2">
              <CalendarDays
                className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>
                <span className="font-medium">{entry.label}</span>
                <span className="text-muted-foreground">
                  {" "}
                  on {formatDayMonth(entry.date)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
