import ical from "node-ical";

import { ALL_DAY_ICS_CASES } from "./all-day-ics-cases";
import { readCalendarFixture } from "./calendar-test-helpers";
import { parseCalendar } from "./parse-calendar";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function inspectNodeIcalDate(icsText: string) {
  const parsed = ical.sync.parseICS(icsText);
  const source = Object.values(parsed).find(
    (value) =>
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      value.type === "VEVENT" &&
      "start" in value,
  ) as { start?: Date; end?: Date } | undefined;

  const start = source?.start;
  const end = source?.end;

  if (!(start instanceof Date) || !(end instanceof Date)) {
    return null;
  }

  return {
    dateOnly: "dateOnly" in start ? start.dateOnly : undefined,
    startIso: start.toISOString(),
    startLocalYmd: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-${pad2(start.getDate())}`,
    startUtcYmd: `${start.getUTCFullYear()}-${pad2(start.getUTCMonth() + 1)}-${pad2(start.getUTCDate())}`,
    endLocalYmd: `${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}`,
    endUtcYmd: `${end.getUTCFullYear()}-${pad2(end.getUTCMonth() + 1)}-${pad2(end.getUTCDate())}`,
  };
}

const report = ALL_DAY_ICS_CASES.map((expected) => {
  const ics = readCalendarFixture(expected.fixture);
  const [event] = parseCalendar(ics);

  return {
    fixture: expected.fixture,
    uid: event?.uid ?? null,
    startDate: event?.startDate ?? null,
    exclusiveEndDate: event?.endDate ?? null,
    expectedStartDate: expected.startDate,
    expectedExclusiveEndDate: expected.exclusiveEndDate,
    ok:
      event?.uid === expected.uid &&
      event.isAllDay === true &&
      event.startDate === expected.startDate &&
      event.endDate === expected.exclusiveEndDate &&
      event.startAt === null &&
      event.endAt === null,
    nodeIcal: inspectNodeIcalDate(ics),
  };
});

const payload = {
  tz: process.env.TZ ?? "",
  resolvedTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  report,
};

process.stdout.write(`${JSON.stringify(payload)}\n`);

if (report.some((entry) => !entry.ok)) {
  process.exit(1);
}
