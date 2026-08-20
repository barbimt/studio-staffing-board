import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { resetStaffingTables } from "../src/server/db/reset-staffing";
import * as schema from "../src/server/db/schema";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  const client = postgres(databaseUrl, { max: 1, onnotice() {} });
  const database = drizzle({ client, schema });

  try {
    await resetStaffingTables(database);
  } finally {
    await client.end();
  }

  console.log(
    "Staffing tables are empty. Import data from the board to load a snapshot.",
  );
}

void main();
