import { type YearMonth } from "./month";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function utcDateFromIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function formatIso(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function addUtcDays(iso: string, days: number): string {
  const date = utcDateFromIso(iso);

  return formatIso(
    new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + days,
      ),
    ),
  );
}

function isWeekdayIso(iso: string): boolean {
  const day = utcDateFromIso(iso).getUTCDay();

  return day !== 0 && day !== 6;
}

export function workingDaysInMonth(month: YearMonth): string[] {
  const days: string[] = [];

  for (
    let current = month.monthStart;
    current <= month.monthEnd;
    current = addUtcDays(current, 1)
  ) {
    if (isWeekdayIso(current)) {
      days.push(current);
    }
  }

  return days;
}

export function weekdaysInExclusiveRange({
  startDate,
  endDate,
  month,
}: {
  startDate: string;
  endDate: string;
  month: YearMonth;
}): string[] {
  const days: string[] = [];
  const rangeStart =
    startDate > month.monthStart ? startDate : month.monthStart;

  for (
    let current = rangeStart;
    current < endDate && current <= month.monthEnd;
    current = addUtcDays(current, 1)
  ) {
    if (isWeekdayIso(current)) {
      days.push(current);
    }
  }

  return days;
}
