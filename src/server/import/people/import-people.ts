import { sql } from "drizzle-orm";
import postgres from "postgres";

import { type AppDatabase } from "../../db/client";
import { people } from "../../db/schema";
import { PeopleImportError, type Person } from "./people.schema";

export async function importPeople(
  database: AppDatabase,
  records: Person[],
): Promise<{ count: number }> {
  if (records.length === 0) {
    return { count: 0 };
  }

  try {
    await database.transaction(async (tx) => {
      await tx
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
    });
  } catch (error) {
    if (error instanceof PeopleImportError) {
      throw error;
    }

    if (
      error instanceof postgres.PostgresError &&
      error.code === "23505" &&
      error.constraint_name === "people_work_email_unique"
    ) {
      throw new PeopleImportError(
        "Work Email already belongs to another person",
      );
    }

    throw new PeopleImportError("People import failed");
  }

  return { count: records.length };
}
