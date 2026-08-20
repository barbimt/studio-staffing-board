import { readFileSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb, type AppDatabase } from "../../db/client";
import { assignments, people, projects } from "../../db/schema";
import { importPeople } from "../people/import-people";
import { parsePeopleCsv } from "../people/parse-people-csv";
import { importProjects } from "./import-projects";
import { parseProjectsCsv } from "./parse-projects-csv";

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

const peopleCsv = `Employee ID,First Name,Last Name,Work Email,Department,Job Title,Site,FTE,Start Date,End Date,Manager Email
E002,Alex,Turner,alex.turner@example.com,Engineering,Lead Developer,Bristol,1.0,2022-06-13,,
E003,Maria,Costa,maria.costa@example.com,Engineering,Developer,Porto,0.8,2023-02-01,,
`;

const initialProjectsCsv = `Name,Status,Client,Platform,Start,End,Team,Allocation %
Project A,Active,Internal,PC,2026-01-01,2026-12-31,"Alex Turner, Maria Costa","60, 40"
`;

const updatedProjectsCsv = `Name,Status,Client,Platform,Start,End,Team,Allocation %
Project A,Active,Internal,PC,2026-01-01,2026-12-31,Alex Turner,80
`;

const emptyAssignmentsCsv = `Name,Status,Client,Platform,Start,End,Team,Allocation %
Project A,Active,Internal,PC,2026-01-01,2026-12-31,,
`;

const unmatchedProjectsCsv = `Name,Status,Client,Platform,Start,End,Team,Allocation %
Project A,Active,Internal,PC,2026-01-01,2026-12-31,Alex Tuner,60
`;

describe.skipIf(!process.env.DATABASE_URL)("importProjects", () => {
  let db: AppDatabase;

  async function tableCount(
    table: typeof people | typeof projects | typeof assignments,
  ) {
    const [row] = await db.select({ count: count() }).from(table);
    return Number(row?.count ?? 0);
  }

  async function projectByName(name: string) {
    const [row] = await db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
      })
      .from(projects)
      .where(eq(projects.name, name));

    return row;
  }

  async function assignmentsForProject(projectId: number) {
    return db
      .select({
        id: assignments.id,
        personId: assignments.personId,
        projectId: assignments.projectId,
        allocationPercentage: assignments.allocationPercentage,
      })
      .from(assignments)
      .where(eq(assignments.projectId, projectId));
  }

  beforeAll(async () => {
    db = createDb();
  });

  beforeEach(async () => {
    await db.delete(assignments);
    await db.delete(projects);
    await db.delete(people);
    await importPeople(db, parsePeopleCsv(peopleCsv));
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it("upserts projects and assignments without duplicating or changing project ids", async () => {
    const records = parseProjectsCsv(initialProjectsCsv);

    await importProjects(db, records);
    expect(await tableCount(projects)).toBe(1);
    expect(await tableCount(assignments)).toBe(2);

    const before = await projectByName("Project A");
    const beforeAssignments = await assignmentsForProject(before?.id ?? 0);

    await importProjects(db, records);
    expect(await tableCount(projects)).toBe(1);
    expect(await tableCount(assignments)).toBe(2);

    const after = await projectByName("Project A");
    const afterAssignments = await assignmentsForProject(after?.id ?? 0);

    expect(after?.id).toBe(before?.id);
    expect(afterAssignments.map((row) => row.id).sort()).toEqual(
      beforeAssignments.map((row) => row.id).sort(),
    );
  });

  it("updates changed allocations and removes stale assignments", async () => {
    await importProjects(db, parseProjectsCsv(initialProjectsCsv));

    const project = await projectByName("Project A");
    const [alex] = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.employeeId, "E002"));

    await importProjects(db, parseProjectsCsv(updatedProjectsCsv));

    expect(await tableCount(projects)).toBe(1);
    expect(await tableCount(assignments)).toBe(1);
    expect((await projectByName("Project A"))?.id).toBe(project?.id);

    const remaining = await assignmentsForProject(project?.id ?? 0);
    expect(remaining).toEqual([
      {
        id: remaining[0]?.id,
        personId: alex?.id,
        projectId: project?.id,
        allocationPercentage: 80,
      },
    ]);
  });

  it("deletes every assignment when an imported project has none", async () => {
    await importProjects(db, parseProjectsCsv(initialProjectsCsv));
    expect(await tableCount(assignments)).toBe(2);

    await importProjects(db, parseProjectsCsv(emptyAssignmentsCsv));

    expect(await tableCount(projects)).toBe(1);
    expect(await tableCount(assignments)).toBe(0);
  });

  it("persists nothing when a team member cannot be matched", async () => {
    await expect(
      importProjects(db, parseProjectsCsv(unmatchedProjectsCsv)),
    ).rejects.toThrow(
      /Project "Project A": team member "Alex Tuner" could not be matched to a canonical person/,
    );

    expect(await tableCount(projects)).toBe(0);
    expect(await tableCount(assignments)).toBe(0);
  });
});
