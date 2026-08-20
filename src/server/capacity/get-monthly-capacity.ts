import "server-only";

import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";

import { type AppDatabase } from "../db/client";
import { assignments, people, projects } from "../db/schema";
import {
  buildMonthlyPersonCapacity,
  type CapacityProject,
  type MonthlyPersonCapacity,
} from "./calculate-capacity";
import { parseYearMonth } from "./month";

export async function getMonthlyCapacity(
  database: AppDatabase,
  month: string,
): Promise<MonthlyPersonCapacity[]> {
  const { monthStart, monthEnd } = parseYearMonth(month);

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
    .orderBy(asc(people.lastName), asc(people.firstName));

  if (activePeople.length === 0) {
    return [];
  }

  const assignmentRows = await database
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
        inArray(
          assignments.personId,
          activePeople.map((person) => person.id),
        ),
        lte(projects.startDate, monthEnd),
        gte(projects.endDate, monthStart),
      ),
    );

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

  return activePeople.map((person) =>
    buildMonthlyPersonCapacity(person, projectsByPersonId.get(person.id) ?? []),
  );
}
