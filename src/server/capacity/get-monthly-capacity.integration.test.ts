import { readFileSync } from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDb, type AppDatabase } from "../db/client";
import { assignments, people, projects } from "../db/schema";
import { importPeople } from "../import/people/import-people";
import { parsePeopleCsv } from "../import/people/parse-people-csv";
import { importProjects } from "../import/projects/import-projects";
import { parseProjectsCsv } from "../import/projects/parse-projects-csv";
import { getMonthlyCapacity } from "./get-monthly-capacity";

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

function readDataFile(name: string): string {
  return readFileSync(path.resolve(process.cwd(), "data", name), "utf8");
}

describe.skipIf(!process.env.DATABASE_URL)("getMonthlyCapacity", () => {
  let db: AppDatabase;

  beforeAll(async () => {
    db = createDb();
    await db.delete(assignments);
    await db.delete(projects);
    await db.delete(people);

    await importPeople(db, parsePeopleCsv(readDataFile("people-export.csv")));
    await importProjects(
      db,
      parseProjectsCsv(readDataFile("projects-export.csv")),
    );
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it("includes an unassigned person while they are still employed", async () => {
    const results = await getMonthlyCapacity(db, "2026-06");
    const ben = results.find((row) => row.person.employeeId === "E006");

    expect(results).toHaveLength(15);
    expect(ben).toMatchObject({
      projects: [],
      contractualCapacityPercentage: 100,
      totalAllocation: 0,
      remainingCapacity: 100,
      status: "available",
    });
    expect(ben?.person).toMatchObject({
      firstName: "Ben",
      lastName: "Fletcher",
      fte: 1,
    });
  });

  it("computes September 2026 allocations from overlapping projects only", async () => {
    const results = await getMonthlyCapacity(db, "2026-09");
    const byEmployeeId = new Map(
      results.map((row) => [row.person.employeeId, row]),
    );

    expect(results).toHaveLength(14);
    expect(byEmployeeId.has("E006")).toBe(false);

    const alex = byEmployeeId.get("E002");
    expect(alex?.projects.map((project) => project.name)).toEqual([
      "Orchard Grove",
      "Pebble Rush",
    ]);
    expect(alex).toMatchObject({
      contractualCapacityPercentage: 100,
      totalAllocation: 110,
      remainingCapacity: -10,
      status: "overcommitted",
    });

    const maria = byEmployeeId.get("E003");
    expect(maria).toMatchObject({
      person: { fte: 0.8 },
      contractualCapacityPercentage: 80,
      totalAllocation: 110,
      remainingCapacity: -30,
      status: "overcommitted",
    });

    const samuel = byEmployeeId.get("E004");
    expect(samuel).toMatchObject({
      contractualCapacityPercentage: 100,
      totalAllocation: 100,
      remainingCapacity: 0,
      status: "at_capacity",
    });

    const priya = byEmployeeId.get("E005");
    expect(priya).toMatchObject({
      person: { fte: 0.6 },
      contractualCapacityPercentage: 60,
      totalAllocation: 50,
      remainingCapacity: 10,
      status: "available",
    });
    expect(priya?.projects).toEqual([
      expect.objectContaining({ name: "Lantern", allocationPercentage: 50 }),
    ]);
  });
});
