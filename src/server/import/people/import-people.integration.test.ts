import { readFileSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDb, type AppDatabase } from "../../db/client";
import { assignments, people, projects } from "../../db/schema";
import { importPeople } from "./import-people";
import { parsePeopleCsv } from "./parse-people-csv";
import { readPeopleFixture } from "./people-csv.test-helpers";

function applyDatabaseUrlFromEnvFile() {
  if (process.env.DATABASE_URL) {
    return;
  }

  try {
    const envFile = readFileSync(path.resolve(process.cwd(), ".env"), "utf8");

    for (const line of envFile.split("\n")) {
      const match = /^DATABASE_URL=(.*)$/.exec(line.trim());
      if (match) {
        process.env.DATABASE_URL = match[1];
        return;
      }
    }
  } catch {
    // No local .env (CI).
  }
}

applyDatabaseUrlFromEnvFile();

const sampleCsv = readPeopleFixture("people.csv");

describe.skipIf(!process.env.DATABASE_URL)("importPeople", () => {
  let db: AppDatabase;

  async function peopleCount() {
    const [row] = await db.select({ count: count() }).from(people);
    return Number(row?.count ?? 0);
  }

  async function personByEmployeeId(employeeId: string) {
    const [row] = await db
      .select({
        id: people.id,
        employeeId: people.employeeId,
        jobTitle: people.jobTitle,
      })
      .from(people)
      .where(eq(people.employeeId, employeeId));

    return row;
  }

  beforeAll(async () => {
    db = createDb();
    await db.delete(assignments);
    await db.delete(projects);
    await db.delete(people);
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it("upserts by employee id without duplicating or changing people.id", async () => {
    const records = parsePeopleCsv(sampleCsv);

    await importPeople(db, records);
    expect(await peopleCount()).toBe(2);

    await importPeople(db, records);
    expect(await peopleCount()).toBe(2);

    const before = await personByEmployeeId("E001");
    expect(before).toMatchObject({
      employeeId: "E001",
      jobTitle: "Studio Director",
    });

    await db
      .update(people)
      .set({ jobTitle: "Changed Title" })
      .where(eq(people.employeeId, "E001"));

    await importPeople(db, records);

    const after = await personByEmployeeId("E001");
    expect(await peopleCount()).toBe(2);
    expect(after?.id).toBe(before?.id);
    expect(after?.jobTitle).toBe("Studio Director");
  });
});
