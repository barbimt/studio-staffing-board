import {
  calculateCapacityStatus,
  calculateContractualCapacityPercentage,
  calculateEffectiveCapacityPercentage,
  calculateTotalAllocation,
  roundCapacityPercentage,
  type CapacityStatus,
} from "./capacity-math";

export type { CapacityStatus };

export type MonthBounds = {
  monthStart: string;
  monthEnd: string;
};

export type CapacityPerson = {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  site: string;
  fte: number;
};

export type CapacityProject = {
  id: number;
  name: string;
  allocationPercentage: number;
};

export type MonthlyPersonCapacity = {
  person: CapacityPerson;
  projects: CapacityProject[];
  contractualCapacityPercentage: number;
  effectiveCapacityPercentage: number;
  totalAllocationPercentage: number;
  remainingCapacityPercentage: number;
  unavailableWeekdays: number;
  status: CapacityStatus;
};

export {
  calculateCapacityStatus,
  calculateContractualCapacityPercentage,
  calculateEffectiveCapacityPercentage,
  calculateTotalAllocation,
  roundCapacityPercentage,
} from "./capacity-math";

export function isPersonActiveInMonth(
  person: { startDate: string; endDate: string | null },
  month: MonthBounds,
): boolean {
  return (
    person.startDate <= month.monthEnd &&
    (person.endDate === null || person.endDate >= month.monthStart)
  );
}

export function isProjectActiveInMonth(
  project: { startDate: string; endDate: string },
  month: MonthBounds,
): boolean {
  return (
    project.startDate <= month.monthEnd && project.endDate >= month.monthStart
  );
}

export function isRangeActiveInYear(
  range: { startDate: string; endDate: string },
  yearBounds: { yearStart: string; yearEnd: string },
): boolean {
  return (
    range.startDate <= yearBounds.yearEnd &&
    range.endDate >= yearBounds.yearStart
  );
}

export function buildMonthlyPersonCapacity(
  person: CapacityPerson,
  projects: CapacityProject[],
  {
    workingDayCount,
    unavailableWeekdays = 0,
  }: {
    workingDayCount: number;
    unavailableWeekdays?: number;
  },
): MonthlyPersonCapacity {
  const contractualCapacityPercentage = calculateContractualCapacityPercentage(
    person.fte,
  );
  const effectiveCapacityPercentage = calculateEffectiveCapacityPercentage({
    contractualCapacityPercentage,
    workingDayCount,
    unavailableWeekdays,
  });
  const totalAllocationPercentage = calculateTotalAllocation(projects);
  const remainingCapacityPercentage = roundCapacityPercentage(
    effectiveCapacityPercentage - totalAllocationPercentage,
  );

  return {
    person,
    projects,
    contractualCapacityPercentage,
    effectiveCapacityPercentage,
    totalAllocationPercentage,
    remainingCapacityPercentage,
    unavailableWeekdays,
    status: calculateCapacityStatus({
      effectiveCapacityPercentage,
      totalAllocationPercentage,
    }),
  };
}
