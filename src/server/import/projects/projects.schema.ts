import { z } from "zod";

export class ProjectsImportError extends Error {
  readonly messages: string[];

  constructor(messages: string | string[]) {
    const list = Array.isArray(messages) ? messages : [messages];
    super(list.join("\n"));
    this.name = "ProjectsImportError";
    this.messages = list;
  }
}

function requiredString(field: string) {
  return z
    .string({ error: `${field} is required` })
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { error: `${field} is required` });
}

function requiredDate(field: string) {
  return z
    .string({ error: `${field} is required` })
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { error: `${field} is required` })
    .pipe(z.iso.date({ error: `${field} is invalid` }));
}

export function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function splitList(value: string): string[] {
  const trimmed = value.trim();

  if (trimmed === "") {
    return [];
  }

  return trimmed.split(",").map((entry) => entry.trim());
}

export const projectsCsvRowSchema = z
  .object({
    Name: requiredString("Name"),
    Status: requiredString("Status"),
    Client: requiredString("Client"),
    Platform: requiredString("Platform"),
    Start: requiredDate("Start"),
    End: requiredDate("End"),
    Team: z.string({ error: "Team is required" }),
    "Allocation %": z.string({ error: "Allocation % is required" }),
  })
  .transform((row, ctx) => {
    const names = splitList(row.Team);
    const allocations = splitList(row["Allocation %"]);

    if (names.length !== allocations.length) {
      ctx.addIssue({
        code: "custom",
        message:
          "Team and Allocation % must contain the same number of entries",
      });
      return z.NEVER;
    }

    let failed = false;
    const assignments: Array<{
      personName: string;
      allocationPercentage: number;
    }> = [];
    const seenNames = new Set<string>();

    for (const [index, personName] of names.entries()) {
      const allocationRaw = allocations[index] ?? "";

      if (personName === "") {
        ctx.addIssue({ code: "custom", message: "Team entry is required" });
        failed = true;
        continue;
      }

      if (!/^\d+$/.test(allocationRaw)) {
        ctx.addIssue({ code: "custom", message: "Allocation % is invalid" });
        failed = true;
        continue;
      }

      const normalizedName = normalizePersonName(personName);

      if (seenNames.has(normalizedName)) {
        ctx.addIssue({
          code: "custom",
          message: `Team member "${personName}" is duplicated`,
        });
        failed = true;
        continue;
      }

      seenNames.add(normalizedName);
      assignments.push({
        personName,
        allocationPercentage: Number(allocationRaw),
      });
    }

    if (failed) {
      return z.NEVER;
    }

    return {
      name: row.Name,
      status: row.Status,
      client: row.Client,
      platform: row.Platform,
      startDate: row.Start,
      endDate: row.End,
      assignments,
    };
  });

export type ImportedProject = z.infer<typeof projectsCsvRowSchema>;
