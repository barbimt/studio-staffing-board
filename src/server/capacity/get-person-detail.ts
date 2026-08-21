import "server-only";

import { and, asc, eq, gt, lte, or } from "drizzle-orm";

import { clipExclusiveRangeToMonth } from "@/lib/format-staffing-dates";

import { type AppDatabase } from "../db/client";
import {
  assignments,
  calendarEventOccurrences,
  calendarEvents,
  people,
  projects,
} from "../db/schema";
import {
  buildMonthlyPersonCapacity,
  isPersonActiveInMonth,
  isProjectActiveInMonth,
  isRangeActiveInYear,
  type CapacityPerson,
  type CapacityProject,
  type MonthlyPersonCapacity,
} from "./calculate-capacity";
import { LEAVE_CATEGORY, regionForSite } from "./holiday-regions";
import { leaveLabelFromSummary } from "./leave-label";
import { calendarYearBounds, parseYearMonth } from "./month";
import { mergeUnavailableWeekdays } from "./unavailable-weekdays";
import { weekdaysInExclusiveRange, workingDaysInMonth } from "./working-days";

export type PersonDetailPerson = CapacityPerson & {
  department: string;
  startDate: string;
  endDate: string | null;
};

export type PersonAssignment = {
  assignmentId: number;
  projectId: number;
  name: string;
  client: string;
  status: string;
  startDate: string;
  endDate: string;
  allocationPercentage: number;
  activeInSelectedMonth: boolean;
  overlapsSelectedYear: boolean;
};

export type PersonLeaveRange = {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
};

export type PersonHolidayMarker = {
  id: number;
  label: string;
  date: string;
};

export type PersonTimeOff = {
  leave: PersonLeaveRange[];
  holidays: PersonHolidayMarker[];
};

export type PersonMonthCapacity = MonthlyPersonCapacity & {
  leaveWeekdays: number;
  holidayWeekdays: number;
  overlappingWeekdays: number;
  workingDayCount: number;
};

export type PersonDetail = {
  person: PersonDetailPerson;
  selectedMonth: string;
  employedInSelectedMonth: boolean;
  holidayRegion: string | null;
  month: PersonMonthCapacity;
  assignments: PersonAssignment[];
  timeOff: PersonTimeOff;
};

export async function getPersonDetail(
  database: AppDatabase,
  personId: number,
  month: string,
): Promise<PersonDetail | null> {
  const yearMonth = parseYearMonth(month);
  const workingDays = workingDaysInMonth(yearMonth);
  const yearBounds = calendarYearBounds(yearMonth.year);

  const [person] = await database
    .select({
      id: people.id,
      employeeId: people.employeeId,
      firstName: people.firstName,
      lastName: people.lastName,
      jobTitle: people.jobTitle,
      department: people.department,
      site: people.site,
      fte: people.fte,
      startDate: people.startDate,
      endDate: people.endDate,
    })
    .from(people)
    .where(eq(people.id, personId))
    .limit(1);

  if (!person) {
    return null;
  }

  const holidayRegion = regionForSite(person.site);

  const [assignmentRows, occurrenceRows] = await Promise.all([
    database
      .select({
        assignmentId: assignments.id,
        projectId: projects.id,
        name: projects.name,
        client: projects.client,
        status: projects.status,
        startDate: projects.startDate,
        endDate: projects.endDate,
        allocationPercentage: assignments.allocationPercentage,
      })
      .from(assignments)
      .innerJoin(projects, eq(assignments.projectId, projects.id))
      .where(eq(assignments.personId, personId))
      .orderBy(asc(projects.name)),
    database
      .select({
        occurrenceId: calendarEventOccurrences.id,
        personId: calendarEvents.personId,
        category: calendarEvents.category,
        appliesToRegion: calendarEvents.appliesToRegion,
        summary: calendarEvents.summary,
        startDate: calendarEventOccurrences.startDate,
        endDate: calendarEventOccurrences.endDate,
      })
      .from(calendarEventOccurrences)
      .innerJoin(
        calendarEvents,
        eq(calendarEventOccurrences.eventId, calendarEvents.id),
      )
      .where(
        and(
          lte(calendarEventOccurrences.startDate, yearMonth.monthEnd),
          gt(calendarEventOccurrences.endDate, yearMonth.monthStart),
          holidayRegion
            ? or(
                and(
                  eq(calendarEvents.category, LEAVE_CATEGORY),
                  eq(calendarEvents.personId, personId),
                ),
                eq(calendarEvents.appliesToRegion, holidayRegion),
              )
            : and(
                eq(calendarEvents.category, LEAVE_CATEGORY),
                eq(calendarEvents.personId, personId),
              ),
        ),
      ),
  ]);

  const personAssignments: PersonAssignment[] = assignmentRows.map((row) => ({
    assignmentId: row.assignmentId,
    projectId: row.projectId,
    name: row.name,
    client: row.client,
    status: row.status,
    startDate: row.startDate,
    endDate: row.endDate,
    allocationPercentage: row.allocationPercentage,
    activeInSelectedMonth: isProjectActiveInMonth(row, yearMonth),
    overlapsSelectedYear: isRangeActiveInYear(row, yearBounds),
  }));

  const monthProjects: CapacityProject[] = personAssignments
    .filter((assignment) => assignment.activeInSelectedMonth)
    .map((assignment) => ({
      id: assignment.projectId,
      name: assignment.name,
      allocationPercentage: assignment.allocationPercentage,
    }));

  const leaveDates = new Set<string>();
  const holidayDates = new Set<string>();
  const leave: PersonLeaveRange[] = [];
  const holidays: PersonHolidayMarker[] = [];

  for (const row of occurrenceRows) {
    const clipped = clipExclusiveRangeToMonth(
      row.startDate,
      row.endDate,
      yearMonth,
    );

    if (!clipped) {
      continue;
    }

    if (row.category === LEAVE_CATEGORY && row.personId === personId) {
      leave.push({
        id: row.occurrenceId,
        label: leaveLabelFromSummary(row.summary, person),
        startDate: clipped.startDate,
        endDate: clipped.endDate,
      });

      for (const day of weekdaysInExclusiveRange({
        startDate: row.startDate,
        endDate: row.endDate,
        month: yearMonth,
      })) {
        leaveDates.add(day);
      }

      continue;
    }

    if (row.appliesToRegion && row.appliesToRegion === holidayRegion) {
      holidays.push({
        id: row.occurrenceId,
        label: row.summary,
        date: clipped.startDate,
      });

      for (const day of weekdaysInExclusiveRange({
        startDate: row.startDate,
        endDate: row.endDate,
        month: yearMonth,
      })) {
        holidayDates.add(day);
      }
    }
  }

  leave.sort(compareLeave);
  holidays.sort(compareHoliday);

  const unavailable = mergeUnavailableWeekdays(leaveDates, holidayDates);
  const capacityPerson: CapacityPerson = {
    id: person.id,
    employeeId: person.employeeId,
    firstName: person.firstName,
    lastName: person.lastName,
    jobTitle: person.jobTitle,
    site: person.site,
    fte: person.fte,
  };
  const monthly = buildMonthlyPersonCapacity(capacityPerson, monthProjects, {
    workingDayCount: workingDays.length,
    unavailableWeekdays: unavailable.unavailableWeekdays,
  });

  return {
    person,
    selectedMonth: month,
    employedInSelectedMonth: isPersonActiveInMonth(person, yearMonth),
    holidayRegion,
    month: {
      ...monthly,
      leaveWeekdays: unavailable.leaveWeekdays,
      holidayWeekdays: unavailable.holidayWeekdays,
      overlappingWeekdays: unavailable.overlappingWeekdays,
      workingDayCount: workingDays.length,
    },
    assignments: personAssignments,
    timeOff: { leave, holidays },
  };
}

function compareLeave(left: PersonLeaveRange, right: PersonLeaveRange): number {
  return (
    left.startDate.localeCompare(right.startDate) ||
    left.endDate.localeCompare(right.endDate) ||
    left.label.localeCompare(right.label)
  );
}

function compareHoliday(
  left: PersonHolidayMarker,
  right: PersonHolidayMarker,
): number {
  return (
    left.date.localeCompare(right.date) || left.label.localeCompare(right.label)
  );
}
