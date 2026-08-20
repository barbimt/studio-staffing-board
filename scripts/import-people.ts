import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { count } from "drizzle-orm";

import { createDb } from "../src/server/db/client";
import { people } from "../src/server/db/schema";
import { importPeople } from "../src/server/import/people/import-people";
import {
  parsePeopleCsv,
  PeopleImportError,
} from "../src/server/import/people/parse-people-csv";

const csvPath = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../data/people-export.csv",
);

async function main() {
  const csvText = readFileSync(csvPath, "utf8");
  const records = parsePeopleCsv(csvText);
  const db = createDb();

  try {
    const result = await importPeople(db, records);
    const [row] = await db.select({ count: count() }).from(people);

    console.log(`Imported ${result.count} people.`);
    console.log(`people table count: ${row?.count ?? 0}`);
  } finally {
    await db.$client.end();
  }
}

main().catch((error) => {
  if (error instanceof PeopleImportError) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  console.error(
    error instanceof Error ? error.message : "People import failed",
  );
  process.exitCode = 1;
});
