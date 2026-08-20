import { inArray, notInArray, sql } from "drizzle-orm";
import postgres from "postgres";

import { type AppDb } from "../../db/client";
import { assignments, people } from "../../db/schema";
import { PeopleImportError, type Person } from "./people.schema";

export async function importPeople(
  database: AppDb,
  records: Person[],
): Promise<{ count: number }> {
  const employeeIds = records.map((person) => person.employeeId);

  try {
    const stalePeople =
      employeeIds.length === 0
        ? await database.select({ id: people.id }).from(people)
        : await database
            .select({ id: people.id })
            .from(people)
            .where(notInArray(people.employeeId, employeeIds));

    if (stalePeople.length > 0) {
      const staleIds = stalePeople.map((person) => person.id);

      await database
        .delete(assignments)
        .where(inArray(assignments.personId, staleIds));
      await database.delete(people).where(inArray(people.id, staleIds));
    }

    if (records.length > 0) {
      await database
        .update(people)
        .set({
          workEmail: sql`'importing.' || ${people.employeeId} || '@invalid'`,
        })
        .where(inArray(people.employeeId, employeeIds));

      await database
        .insert(people)
        .values(records)
        .onConflictDoUpdate({
          target: people.employeeId,
          set: {
            firstName: sql`excluded.first_name`,
            lastName: sql`excluded.last_name`,
            workEmail: sql`excluded.work_email`,
            department: sql`excluded.department`,
            jobTitle: sql`excluded.job_title`,
            site: sql`excluded.site`,
            fte: sql`excluded.fte`,
            startDate: sql`excluded.start_date`,
            endDate: sql`excluded.end_date`,
            managerEmail: sql`excluded.manager_email`,
          },
        });
    }
  } catch (error) {
    if (
      error instanceof postgres.PostgresError &&
      error.code === "23505" &&
      error.constraint_name === "people_work_email_unique"
    ) {
      throw new PeopleImportError(
        "Work Email already belongs to another person",
      );
    }

    throw error;
  }

  return { count: records.length };
}
