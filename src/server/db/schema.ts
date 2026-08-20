import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const people = pgTable("people", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: text("employee_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  workEmail: text("work_email").notNull().unique(),
  department: text("department").notNull(),
  jobTitle: text("job_title").notNull(),
  site: text("site").notNull(),
  fte: numeric("fte", { precision: 4, scale: 2, mode: "number" }).notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }),
  managerEmail: text("manager_email"),
});

export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  status: text("status").notNull(),
  client: text("client").notNull(),
  platform: text("platform").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
});

export const assignments = pgTable(
  "assignments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    personId: integer("person_id")
      .notNull()
      .references(() => people.id),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    allocationPercentage: integer("allocation_percentage").notNull(),
  },
  (table) => [
    unique("assignments_person_id_project_id_unique").on(
      table.personId,
      table.projectId,
    ),
    index("assignments_project_id_idx").on(table.projectId),
  ],
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    uid: text("uid").notNull().unique(),
    personId: integer("person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    appliesToRegion: text("applies_to_region"),
    summary: text("summary").notNull(),
    category: text("category").notNull(),
    status: text("status").notNull(),
    isAllDay: boolean("is_all_day").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    startAt: timestamp("start_at", { withTimezone: true, mode: "date" }),
    endAt: timestamp("end_at", { withTimezone: true, mode: "date" }),
    timeZone: text("time_zone"),
    rrule: text("rrule"),
  },
  (table) => [index("calendar_events_person_id_idx").on(table.personId)],
);

export const calendarEventOccurrences = pgTable(
  "calendar_event_occurrences",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    eventId: integer("event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    startAt: timestamp("start_at", { withTimezone: true, mode: "date" }),
    endAt: timestamp("end_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    unique("calendar_event_occurrences_event_id_start_date_unique").on(
      table.eventId,
      table.startDate,
    ),
    index("calendar_event_occurrences_start_date_idx").on(table.startDate),
  ],
);
