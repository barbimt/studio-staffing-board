import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { count } from "drizzle-orm";

import { createDb } from "../src/server/db/client";
import {
  calendarEventOccurrences,
  calendarEvents,
} from "../src/server/db/schema";
import { importCalendar } from "../src/server/import/calendar/import-calendar";
import {
  CalendarImportError,
  parseCalendar,
} from "../src/server/import/calendar/parse-calendar";

const icsPath = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../data/leave-calendar.ics",
);

async function main() {
  const icsText = readFileSync(icsPath, "utf8");
  const records = parseCalendar(icsText);
  const db = createDb();

  try {
    const result = await importCalendar(db, records);
    const [eventRow] = await db.select({ count: count() }).from(calendarEvents);
    const [occurrenceRow] = await db
      .select({ count: count() })
      .from(calendarEventOccurrences);

    console.log(`Imported ${result.eventCount} calendar events.`);
    console.log(`Imported ${result.occurrenceCount} occurrences.`);
    console.log(`calendar_events table count: ${eventRow?.count ?? 0}`);
    console.log(
      `calendar_event_occurrences table count: ${occurrenceRow?.count ?? 0}`,
    );
  } finally {
    await db.$client.end();
  }
}

main().catch((error) => {
  if (error instanceof CalendarImportError) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  console.error(
    error instanceof Error ? error.message : "Calendar import failed",
  );
  process.exitCode = 1;
});
