import "server-only";

import {
  and,
  asc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
} from "drizzle-orm";

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
  type CapacityProject,
  type MonthlyPersonCapacity,
} from "./calculate-capacity";
import { LEAVE_CATEGORY, regionForSite } from "./holiday-regions";
import { parseYearMonth } from "./month";
import { mergeUnavailableWeekdays } from "./unavailable-weekdays";
import { weekdaysInExclusiveRange, workingDaysInMonth } from "./working-days";

export async function getMonthlyCapacity(
  database: AppDatabase,
  month: string,
): Promise<MonthlyPersonCapacity[]> {
  const yearMonth = parseYearMonth(month);
  const { monthStart, monthEnd } = yearMonth;
  const workingDays = workingDaysInMonth(yearMonth);

  const activePeople = await database
    .select({
      id: people.id,
      employeeId: people.employeeId,
      firstName: people.firstName,
      lastName: people.lastName,
      jobTitle: people.jobTitle,
      site: people.site,
      fte: people.fte,
    })
    .from(people)
    .where(
      and(
        lte(people.startDate, monthEnd),
        or(isNull(people.endDate), gte(people.endDate, monthStart)),
      ),
    )
    .orderBy(asc(people.firstName), asc(people.lastName));

  if (activePeople.length === 0) {
    return [];
  }

  const activePersonIds = activePeople.map((person) => person.id);

  const [assignmentRows, occurrenceRows] = await Promise.all([
    database
      .select({
        personId: assignments.personId,
        projectId: projects.id,
        projectName: projects.name,
        allocationPercentage: assignments.allocationPercentage,
      })
      .from(assignments)
      .innerJoin(projects, eq(assignments.projectId, projects.id))
      .where(
        and(
          inArray(assignments.personId, activePersonIds),
          lte(projects.startDate, monthEnd),
          gte(projects.endDate, monthStart),
        ),
      ),
    database
      .select({
        personId: calendarEvents.personId,
        category: calendarEvents.category,
        appliesToRegion: calendarEvents.appliesToRegion,
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
          lte(calendarEventOccurrences.startDate, monthEnd),
          gt(calendarEventOccurrences.endDate, monthStart),
          or(
            and(
              eq(calendarEvents.category, LEAVE_CATEGORY),
              inArray(calendarEvents.personId, activePersonIds),
            ),
            isNotNull(calendarEvents.appliesToRegion),
          ),
        ),
      ),
  ]);

  const projectsByPersonId = new Map<number, CapacityProject[]>();

  for (const row of assignmentRows) {
    const personProjects = projectsByPersonId.get(row.personId) ?? [];
    personProjects.push({
      id: row.projectId,
      name: row.projectName,
      allocationPercentage: row.allocationPercentage,
    });
    projectsByPersonId.set(row.personId, personProjects);
  }

  for (const personProjects of projectsByPersonId.values()) {
    personProjects.sort((left, right) => left.name.localeCompare(right.name));
  }

  const leaveByPersonId = new Map<number, Set<string>>();
  const holidaysByRegion = new Map<string, Set<string>>();

  for (const row of occurrenceRows) {
    const weekdays = weekdaysInExclusiveRange({
      startDate: row.startDate,
      endDate: row.endDate,
      month: yearMonth,
    });

    if (row.category === LEAVE_CATEGORY && row.personId != null) {
      const days = leaveByPersonId.get(row.personId) ?? new Set<string>();
      for (const day of weekdays) {
        days.add(day);
      }
      leaveByPersonId.set(row.personId, days);
      continue;
    }

    if (row.appliesToRegion) {
      const days =
        holidaysByRegion.get(row.appliesToRegion) ?? new Set<string>();
      for (const day of weekdays) {
        days.add(day);
      }
      holidaysByRegion.set(row.appliesToRegion, days);
    }
  }

  return activePeople.map((person) => {
    const region = regionForSite(person.site);
    const { unavailableWeekdays } = mergeUnavailableWeekdays(
      leaveByPersonId.get(person.id) ?? [],
      region ? (holidaysByRegion.get(region) ?? []) : [],
    );

    return buildMonthlyPersonCapacity(
      person,
      projectsByPersonId.get(person.id) ?? [],
      {
        workingDayCount: workingDays.length,
        unavailableWeekdays,
      },
    );
  });
}
