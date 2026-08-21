function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function utcDateFromIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

export function addUtcDays(iso: string, days: number): string {
  const date = utcDateFromIso(iso);
  const shifted = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
    ),
  );

  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

export function formatDayMonth(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(utcDateFromIso(iso));
}

function lastInclusiveDay(
  startDate: string,
  endDate: string,
  exclusiveEnd: boolean,
): string {
  const lastDay = exclusiveEnd ? addUtcDays(endDate, -1) : endDate;

  return lastDay <= startDate ? startDate : lastDay;
}

export function formatInclusiveDateRange(
  startDate: string,
  endDate: string,
  { exclusiveEnd = false }: { exclusiveEnd?: boolean } = {},
): string {
  const lastDay = lastInclusiveDay(startDate, endDate, exclusiveEnd);

  if (lastDay === startDate) {
    return formatDayMonth(startDate);
  }

  return `${formatDayMonth(startDate)} – ${formatDayMonth(lastDay)}`;
}

export function inclusiveDayCount(
  startDate: string,
  endDate: string,
  { exclusiveEnd = false }: { exclusiveEnd?: boolean } = {},
): number {
  const lastDay = lastInclusiveDay(startDate, endDate, exclusiveEnd);
  const start = utcDateFromIso(startDate);
  const last = utcDateFromIso(lastDay);

  return (
    Math.round((last.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  );
}

export function clipExclusiveRangeToMonth(
  startDate: string,
  endDate: string,
  month: { monthStart: string; monthEnd: string },
): { startDate: string; endDate: string } | null {
  const clipStart = startDate > month.monthStart ? startDate : month.monthStart;
  const monthExclusiveEnd = addUtcDays(month.monthEnd, 1);
  const clipEnd = endDate < monthExclusiveEnd ? endDate : monthExclusiveEnd;

  if (clipStart >= clipEnd) {
    return null;
  }

  return { startDate: clipStart, endDate: clipEnd };
}

export function isoDayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

export function isWeekendIso(iso: string): boolean {
  const day = utcDateFromIso(iso).getUTCDay();

  return day === 0 || day === 6;
}
