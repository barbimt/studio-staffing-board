CREATE TABLE "assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"person_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"allocation_percentage" integer NOT NULL,
	CONSTRAINT "assignments_person_id_project_id_unique" UNIQUE("person_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "calendar_event_occurrences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "calendar_event_occurrences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	CONSTRAINT "calendar_event_occurrences_event_id_start_date_unique" UNIQUE("event_id","start_date")
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "calendar_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uid" text NOT NULL,
	"person_id" integer,
	"applies_to_region" text,
	"summary" text NOT NULL,
	"category" text NOT NULL,
	"status" text NOT NULL,
	"is_all_day" boolean NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"time_zone" text,
	"rrule" text,
	CONSTRAINT "calendar_events_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "people_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"employee_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"work_email" text NOT NULL,
	"department" text NOT NULL,
	"job_title" text NOT NULL,
	"site" text NOT NULL,
	"fte" numeric(4, 2) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"manager_email" text,
	CONSTRAINT "people_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "people_work_email_unique" UNIQUE("work_email")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "projects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"status" text NOT NULL,
	"client" text NOT NULL,
	"platform" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	CONSTRAINT "projects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_occurrences" ADD CONSTRAINT "calendar_event_occurrences_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignments_project_id_idx" ON "assignments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "calendar_event_occurrences_start_date_idx" ON "calendar_event_occurrences" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "calendar_events_person_id_idx" ON "calendar_events" USING btree ("person_id");