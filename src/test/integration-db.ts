import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { resetStaffingTables } from "@/server/db/reset-staffing";
import * as schema from "@/server/db/schema";

export const testDatabaseUrl = process.env.TEST_DATABASE_URL;

export function createTestDb() {
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is not set");
  }

  const client = postgres(testDatabaseUrl, { max: 1, onnotice() {} });
  const db = drizzle({ client, schema });

  return { client, db };
}

export { resetStaffingTables };
