import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { count } from "drizzle-orm";

import { createDb } from "../src/server/db/client";
import { assignments, projects } from "../src/server/db/schema";
import { importProjects } from "../src/server/import/projects/import-projects";
import {
  parseProjectsCsv,
  ProjectsImportError,
} from "../src/server/import/projects/parse-projects-csv";

const csvPath = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../data/projects-export.csv",
);

async function main() {
  const csvText = readFileSync(csvPath, "utf8");
  const records = parseProjectsCsv(csvText);
  const db = createDb();

  try {
    const result = await importProjects(db, records);
    const [projectRow] = await db.select({ count: count() }).from(projects);
    const [assignmentRow] = await db
      .select({ count: count() })
      .from(assignments);

    console.log(`Imported ${result.projectCount} projects.`);
    console.log(`Imported ${result.assignmentCount} assignments.`);
    console.log(`projects table count: ${projectRow?.count ?? 0}`);
    console.log(`assignments table count: ${assignmentRow?.count ?? 0}`);
  } finally {
    await db.$client.end();
  }
}

main().catch((error) => {
  if (error instanceof ProjectsImportError) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  console.error(
    error instanceof Error ? error.message : "Projects import failed",
  );
  process.exitCode = 1;
});
