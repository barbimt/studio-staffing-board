import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { AllocationEditDialog } from "@/components/people/allocation-edit-dialog";
import { PersonMonthTimeOff } from "@/components/people/person-month-time-off";
import { CAPACITY_STATUS_APPEARANCE } from "@/components/staffing/capacity-appearance";
import { CapacitySummary } from "@/components/staffing/capacity-summary";
import { MonthSwitcher } from "@/components/staffing/month-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatInclusiveDateRange } from "@/lib/format-staffing-dates";
import { projectAccentColor } from "@/lib/project-accent";
import { cn } from "@/lib/utils";
import type { PersonDetail } from "@/server/capacity/get-person-detail";
import {
  formatMonthLabel,
  parseYearMonth,
  personDetailHref,
  projectEndedBeforeMonth,
  staffingMonthHref,
} from "@/server/capacity/month";

function formatFte(fte: number): string {
  return `${Number(fte.toFixed(2))} FTE`;
}

const capacityMetricCellClassName =
  "border-border max-sm:odd:border-r max-sm:[&:nth-child(-n+2)]:border-b px-4 py-3 sm:not-last:border-r";

export function PersonDetailView({ detail }: { detail: PersonDetail }) {
  const { person, month, assignments, timeOff, selectedMonth, holidayRegion } =
    detail;
  const monthLabel = formatMonthLabel(selectedMonth);
  const { year, month: monthNumber } = parseYearMonth(selectedMonth);
  const shortMonth = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  const appearance = CAPACITY_STATUS_APPEARANCE[month.status];
  const overAmount = Math.abs(month.remainingCapacityPercentage);
  const yearAssignments = assignments.filter(
    (assignment) => assignment.overlapsSelectedYear,
  );
  const fourthMetric =
    month.status === "overcommitted"
      ? {
          label: "Over",
          value: `${overAmount}%`,
          className: appearance.textClass,
        }
      : month.status === "at_capacity"
        ? { label: "Remaining", value: "0%", className: undefined }
        : {
            label: "Available",
            value: `${month.remainingCapacityPercentage}%`,
            className: appearance.textClass,
          };

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href={staffingMonthHref(selectedMonth)}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground -ml-2",
        )}
      >
        <ChevronLeft aria-hidden="true" data-icon="inline-start" />
        Staffing board
      </Link>

      <header className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-12" aria-hidden="true">
            <AvatarFallback className="text-sm font-medium">
              {person.firstName.charAt(0)}
              {person.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Person detail
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {person.firstName} {person.lastName}
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {person.jobTitle} · {person.site} · {formatFte(person.fte)}
              {person.department ? ` · ${person.department}` : null}
            </p>
          </div>
        </div>
        <MonthSwitcher
          month={selectedMonth}
          hrefForMonth={(nextMonth) => personDetailHref(person.id, nextMonth)}
        />
      </header>

      <Separator className="my-4" />

      <section aria-labelledby="monthly-capacity-heading">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Monthly capacity
        </p>
        <h2
          id="monthly-capacity-heading"
          className="mt-2 text-lg font-semibold"
        >
          {monthLabel}
        </h2>

        {detail.employedInSelectedMonth ? (
          <>
            <dl className="border-border mt-6 grid grid-cols-2 overflow-hidden rounded-xl border sm:grid-cols-4">
              <div className={capacityMetricCellClassName}>
                <dt className="text-muted-foreground text-xs">Contractual</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {month.contractualCapacityPercentage}%
                </dd>
              </div>
              <div className={capacityMetricCellClassName}>
                <dt className="text-muted-foreground text-xs">Effective</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {month.effectiveCapacityPercentage}%
                </dd>
              </div>
              <div className={capacityMetricCellClassName}>
                <dt className="text-muted-foreground text-xs">Allocated</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {month.totalAllocationPercentage}%
                </dd>
              </div>
              <div className={capacityMetricCellClassName}>
                <dt className="text-muted-foreground text-xs">
                  {fourthMetric.label}
                </dt>
                <dd
                  className={cn(
                    "mt-1 text-xl font-semibold tabular-nums",
                    fourthMetric.className,
                  )}
                >
                  {fourthMetric.value}
                </dd>
              </div>
            </dl>
            <div className="mt-5 w-full">
              <CapacitySummary
                totalAllocationPercentage={month.totalAllocationPercentage}
                effectiveCapacityPercentage={month.effectiveCapacityPercentage}
                unavailableWeekdays={month.unavailableWeekdays}
                status={month.status}
              />
            </div>
            <p className="text-muted-foreground mt-3 max-w-3xl text-sm">
              Contractual {month.contractualCapacityPercentage}% is reduced by{" "}
              {month.leaveWeekdays} leave weekday
              {month.leaveWeekdays === 1 ? "" : "s"} and {month.holidayWeekdays}{" "}
              public holiday weekday
              {month.holidayWeekdays === 1 ? "" : "s"}
              {holidayRegion ? "" : " (this site has no regional holidays)"}
              {month.overlappingWeekdays > 0
                ? `, with ${month.overlappingWeekdays} overlapping weekday counted once`
                : ""}
              , then compared with allocation.
            </p>
          </>
        ) : (
          <p className="text-muted-foreground mt-4 text-sm">
            This person is not employed in {monthLabel}, so monthly capacity is
            not calculated for this view.
          </p>
        )}
      </section>

      <Separator className="my-8" />

      <section aria-labelledby="allocations-heading">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Allocations
        </p>
        <h2 id="allocations-heading" className="mt-2 text-lg font-semibold">
          Projects this year
        </h2>

        {yearAssignments.length === 0 ? (
          <p className="text-muted-foreground mt-4 text-sm">
            No project assignments overlap {selectedMonth.slice(0, 4)}.
          </p>
        ) : (
          <ul className="border-border mt-4 divide-y rounded-xl border">
            {yearAssignments.map((assignment) => {
              const otherAllocationPercentage = month.projects
                .filter((project) => project.id !== assignment.projectId)
                .reduce(
                  (total, project) => total + project.allocationPercentage,
                  0,
                );
              const editDisabled = projectEndedBeforeMonth(
                assignment.endDate,
                selectedMonth,
              );

              return (
                <li
                  key={assignment.assignmentId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: projectAccentColor(
                          assignment.projectId,
                        ),
                      }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="font-medium">{assignment.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {assignment.client} ·{" "}
                        {formatInclusiveDateRange(
                          assignment.startDate,
                          assignment.endDate,
                        )}
                      </p>
                      {editDisabled ? (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground mt-1.5 font-normal"
                        >
                          Not active in {shortMonth}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold tabular-nums">
                      {assignment.allocationPercentage}%
                    </p>
                    <AllocationEditDialog
                      personId={person.id}
                      assignmentId={assignment.assignmentId}
                      projectName={assignment.name}
                      currentAllocationPercentage={
                        assignment.allocationPercentage
                      }
                      otherAllocationPercentage={otherAllocationPercentage}
                      effectiveCapacityPercentage={
                        month.effectiveCapacityPercentage
                      }
                      countsTowardSelectedMonth={
                        assignment.activeInSelectedMonth
                      }
                      month={selectedMonth}
                      disabled={editDisabled}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {detail.employedInSelectedMonth && month.status === "overcommitted" ? (
          <p className={cn("mt-3 text-sm", appearance.textClass)}>
            This allocation is {overAmount}% over effective capacity.
          </p>
        ) : null}
      </section>

      <Separator className="my-8" />

      <section aria-labelledby="time-off-heading">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Time off
        </p>
        <h2 id="time-off-heading" className="mt-2 text-lg font-semibold">
          Leave and holidays
        </h2>
        <div className="border-border mt-4 rounded-xl border p-4">
          <PersonMonthTimeOff month={selectedMonth} timeOff={timeOff} />
        </div>
      </section>
    </main>
  );
}
