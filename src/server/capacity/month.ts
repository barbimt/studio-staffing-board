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
