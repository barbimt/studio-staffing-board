import { sql } from "drizzle-orm";

import { type AppDb } from "./client";

export async function resetStaffingTables(database: AppDb) {
  await database.execute(sql`
    TRUNCATE TABLE
      calendar_event_occurrences,
      calendar_events,
      assignments,
      projects,
      people
    RESTART IDENTITY CASCADE
  `);
}
