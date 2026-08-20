import { and, inArray, notInArray, sql } from "drizzle-orm";

import { type AppDb } from "../../db/client";
import { assignments, people, projects } from "../../db/schema";
import { matchProjectMembers } from "./match-project-members";
import { ProjectsImportError, type ImportedProject } from "./projects.schema";

export async function importProjects(
  database: AppDb,
  records: ImportedProject[],
): Promise<{ projectCount: number; assignmentCount: number }> {
  const assignmentCount = records.reduce(
    (total, project) => total + project.assignments.length,
    0,
  );

  try {
    if (records.length === 0) {
      await database.delete(assignments);
      await database.delete(projects);
      return { projectCount: 0, assignmentCount: 0 };
    }

    const peopleRows = await database
      .select({
        id: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
      })
      .from(people);

    const resolved = matchProjectMembers(records, peopleRows);

    const upsertedProjects = await database
      .insert(projects)
      .values(
        resolved.map((project) => ({
          name: project.name,
          status: project.status,
          client: project.client,
          platform: project.platform,
          startDate: project.startDate,
          endDate: project.endDate,
        })),
      )
      .onConflictDoUpdate({
        target: projects.name,
        set: {
          status: sql`excluded.status`,
          client: sql`excluded.client`,
          platform: sql`excluded.platform`,
          startDate: sql`excluded.start_date`,
          endDate: sql`excluded.end_date`,
        },
      })
      .returning({ id: projects.id, name: projects.name });

    const projectIdByName = new Map(
      upsertedProjects.map((project) => [project.name, project.id]),
    );

    const snapshotAssignments: {
      personId: number;
      projectId: number;
      allocationPercentage: number;
    }[] = [];
    const projectIdsWithAssignments: number[] = [];
    const projectIdsWithoutAssignments: number[] = [];

    for (const project of resolved) {
      const projectId = projectIdByName.get(project.name);

      if (projectId === undefined) {
        throw new ProjectsImportError("Projects import failed");
      }

      if (project.assignments.length === 0) {
        projectIdsWithoutAssignments.push(projectId);
        continue;
      }

      projectIdsWithAssignments.push(projectId);

      for (const assignment of project.assignments) {
        snapshotAssignments.push({
          personId: assignment.personId,
          projectId,
          allocationPercentage: assignment.allocationPercentage,
        });
      }
    }

    if (snapshotAssignments.length > 0) {
      const upsertedAssignments = await database
        .insert(assignments)
        .values(snapshotAssignments)
        .onConflictDoUpdate({
          target: [assignments.personId, assignments.projectId],
          set: {
            allocationPercentage: sql`excluded.allocation_percentage`,
          },
        })
        .returning({ id: assignments.id });

      await database.delete(assignments).where(
        and(
          inArray(assignments.projectId, projectIdsWithAssignments),
          notInArray(
            assignments.id,
            upsertedAssignments.map((row) => row.id),
          ),
        ),
      );
    }

    if (projectIdsWithoutAssignments.length > 0) {
      await database
        .delete(assignments)
        .where(inArray(assignments.projectId, projectIdsWithoutAssignments));
    }

    const snapshotNames = resolved.map((project) => project.name);
    const staleProjects = await database
      .select({ id: projects.id })
      .from(projects)
      .where(notInArray(projects.name, snapshotNames));

    if (staleProjects.length > 0) {
      const staleIds = staleProjects.map((project) => project.id);

      await database
        .delete(assignments)
        .where(inArray(assignments.projectId, staleIds));
      await database.delete(projects).where(inArray(projects.id, staleIds));
    }
  } catch (error) {
    if (error instanceof ProjectsImportError) {
      throw error;
    }

    throw new ProjectsImportError("Projects import failed");
  }

  return { projectCount: records.length, assignmentCount };
}
