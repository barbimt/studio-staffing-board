import { z } from "zod";

import {
  optionalDate,
  optionalEmail,
  requiredDate,
  requiredEmail,
  requiredString,
} from "../csv-fields";

export class PeopleImportError extends Error {
  readonly messages: string[];

  constructor(messages: string | string[]) {
    const list = Array.isArray(messages) ? messages : [messages];
    super(list.join("\n"));
    this.name = "PeopleImportError";
    this.messages = list;
  }
}

const fteSchema = z
  .string({ error: "FTE is required" })
  .transform((value, ctx) => {
    const trimmed = value.trim();

    if (trimmed === "") {
      ctx.addIssue({ code: "custom", message: "FTE is required" });
      return z.NEVER;
    }

    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      ctx.addIssue({ code: "custom", message: "FTE is invalid" });
      return z.NEVER;
    }

    return Number(trimmed);
  });

export const peopleCsvRowSchema = z
  .object({
    "Employee ID": requiredString("Employee ID"),
    "First Name": requiredString("First Name"),
    "Last Name": requiredString("Last Name"),
    "Work Email": requiredEmail("Work Email"),
    Department: requiredString("Department"),
    "Job Title": requiredString("Job Title"),
    Site: requiredString("Site"),
    FTE: fteSchema,
    "Start Date": requiredDate("Start Date"),
    "End Date": optionalDate("End Date").optional(),
    "Manager Email": optionalEmail("Manager Email").optional(),
  })
  .transform((row) => ({
    employeeId: row["Employee ID"],
    firstName: row["First Name"],
    lastName: row["Last Name"],
    workEmail: row["Work Email"],
    department: row.Department,
    jobTitle: row["Job Title"],
    site: row.Site,
    fte: row.FTE,
    startDate: row["Start Date"],
    endDate: row["End Date"] ?? null,
    managerEmail: row["Manager Email"] ?? null,
  }))
  .refine(
    (person) => person.endDate === null || person.endDate >= person.startDate,
    { error: "End Date must be on or after Start Date" },
  );

export type Person = z.infer<typeof peopleCsvRowSchema>;
