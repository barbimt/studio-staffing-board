export class MonthlyCapacityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MonthlyCapacityError";
  }
}

export type YearMonth = {
  year: number;
  month: number;
  monthStart: string;
  monthEnd: string;
};

const YEAR_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function parseYearMonth(month: string): YearMonth {
  const match = YEAR_MONTH.exec(month);

  if (!match) {
    throw new MonthlyCapacityError(
      'Month must be YYYY-MM, for example "2026-09"',
    );
  }

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return {
    year,
    month: monthNumber,
    monthStart: `${match[1]}-${match[2]}-01`,
    monthEnd: `${match[1]}-${match[2]}-${pad2(lastDay)}`,
  };
}

function formatYearMonth(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

export function currentYearMonth(now = new Date()): string {
  return formatYearMonth(now.getUTCFullYear(), now.getUTCMonth() + 1);
}

export function shiftYearMonth(month: string, delta: number): string {
  const parsed = parseYearMonth(month);
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1 + delta, 1));

  return formatYearMonth(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1);
}

export function resolveYearMonth(
  raw: string | string[] | undefined,
  now = new Date(),
): string {
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (!value) {
    return currentYearMonth(now);
  }

  try {
    parseYearMonth(value);
    return value;
  } catch {
    return currentYearMonth(now);
  }
}

export function formatMonthLabel(month: string): string {
  const { year, month: monthNumber } = parseYearMonth(month);

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export function staffingMonthHref(month: string): string {
  return `/?month=${month}`;
}

export function personDetailHref(personId: number, month: string): string {
  return `/people/${personId}?month=${month}`;
}

export function calendarYearBounds(year: number): {
  yearStart: string;
  yearEnd: string;
} {
  return {
    yearStart: `${year}-01-01`,
    yearEnd: `${year}-12-31`,
  };
}

export function parsePersonId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) {
    return null;
  }

  const id = Number(raw);

  if (!Number.isSafeInteger(id) || id < 1) {
    return null;
  }

  return id;
}

/** True when the project finished before the first day of `month` (YYYY-MM). */
export function projectEndedBeforeMonth(
  projectEndDate: string,
  month: string,
): boolean {
  return projectEndDate < parseYearMonth(month).monthStart;
}
