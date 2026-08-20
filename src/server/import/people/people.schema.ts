import { z } from "zod";

export class PeopleImportError extends Error {
  readonly messages: string[];

  constructor(messages: string | string[]) {
    const list = Array.isArray(messages) ? messages : [messages];
    super(list.join("\n"));
    this.name = "PeopleImportError";
    this.messages = list;
  }
}

function requiredString(field: string) {
  return z
    .string({ error: `${field} is required` })
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { error: `${field} is required` });
}

function requiredEmail(field: string) {
  return z
    .string({ error: `${field} is required` })
    .transform((value) => value.trim().toLowerCase())
    .refine((value) => value.length > 0, { error: `${field} is required` })
    .pipe(z.email({ error: `${field} is invalid` }));
}

function optionalEmail(field: string) {
  return z
    .string({ error: `${field} is invalid` })
    .transform((value) => {
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed.toLowerCase();
    })
    .pipe(z.email({ error: `${field} is invalid` }).nullable());
}

function requiredDate(field: string) {
  return z
    .string({ error: `${field} is required` })
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { error: `${field} is required` })
    .pipe(z.iso.date({ error: `${field} is invalid` }));
}

function optionalDate(field: string) {
  return z
    .string({ error: `${field} is invalid` })
    .transform((value) => {
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    })
    .pipe(z.iso.date({ error: `${field} is invalid` }).nullable());
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
    "End Date": optionalDate("End Date"),
    "Manager Email": optionalEmail("Manager Email"),
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
    endDate: row["End Date"],
    managerEmail: row["Manager Email"],
  }));

export type Person = z.infer<typeof peopleCsvRowSchema>;
