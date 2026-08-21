export type UnavailableWeekdays = {
  leaveWeekdays: number;
  holidayWeekdays: number;
  overlappingWeekdays: number;
  unavailableWeekdays: number;
};

export function mergeUnavailableWeekdays(
  leaveDates: Iterable<string>,
  holidayDates: Iterable<string>,
): UnavailableWeekdays {
  const leave = new Set(leaveDates);
  const holidays = new Set(holidayDates);
  let overlappingWeekdays = 0;
  const unavailable = new Set(leave);

  for (const day of holidays) {
    if (leave.has(day)) {
      overlappingWeekdays += 1;
    }

    unavailable.add(day);
  }

  return {
    leaveWeekdays: leave.size,
    holidayWeekdays: holidays.size,
    overlappingWeekdays,
    unavailableWeekdays: unavailable.size,
  };
}
