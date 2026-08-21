import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { type AppDatabase } from "../db/client";
import { assignments, projects } from "../db/schema";
import { projectEndedBeforeMonth } from "./month";

export class AssignmentUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssignmentUpdateError";
  }
}

export const assignmentAllocationInputSchema = z.object({
  assignmentId: z.coerce.number().int().positive(),
  personId: z.coerce.number().int().positive(),
  month: z
    .string()
    .regex(
      /^\d{4}-(0[1-9]|1[0-2])$/,
      'Month must be YYYY-MM, for example "2026-09"',
    ),
  allocationPercentage: z
    .string()
    .regex(/^\d+$/, "Allocation must be a whole number")
    .transform((value) => Number(value))
    .pipe(z.number().int().min(0)),
});

export async function updateAssignmentAllocation(
  database: AppDatabase,
  input: {
    assignmentId: number;
    personId: number;
    month: string;
    allocationPercentage: number;
  },
) {
  const [row] = await database
    .select({
      assignmentId: assignments.id,
      projectEndDate: projects.endDate,
    })
    .from(assignments)
    .innerJoin(projects, eq(assignments.projectId, projects.id))
    .where(
      and(
        eq(assignments.id, input.assignmentId),
        eq(assignments.personId, input.personId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new AssignmentUpdateError("Assignment was not found for this person");
  }

  if (projectEndedBeforeMonth(row.projectEndDate, input.month)) {
    throw new AssignmentUpdateError(
      "This project has already ended for the selected month",
    );
  }

  const [updated] = await database
    .update(assignments)
    .set({ allocationPercentage: input.allocationPercentage })
    .where(
      and(
        eq(assignments.id, input.assignmentId),
        eq(assignments.personId, input.personId),
      ),
    )
    .returning({
      id: assignments.id,
      allocationPercentage: assignments.allocationPercentage,
    });

  if (!updated) {
    throw new AssignmentUpdateError("Assignment was not found for this person");
  }

  return updated;
}
