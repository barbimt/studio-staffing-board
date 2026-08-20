export type CapacityStatus = "available" | "at_capacity" | "overcommitted";

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

export function calculateContractualCapacityPercentage(fte: number): number {
  return fte * 100;
}

export function roundCapacityPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateEffectiveCapacityPercentage({
  contractualCapacityPercentage,
  workingDayCount,
  unavailableWeekdays,
}: {
  contractualCapacityPercentage: number;
  workingDayCount: number;
  unavailableWeekdays: number;
}): number {
  if (unavailableWeekdays === 0) {
    return contractualCapacityPercentage;
  }

  const availableDays = workingDayCount - unavailableWeekdays;

  return roundCapacityPercentage(
    (availableDays / workingDayCount) * contractualCapacityPercentage,
  );
}

export function calculateTotalAllocation(
  assignments: { allocationPercentage: number }[],
): number {
  return assignments.reduce(
    (total, assignment) => total + assignment.allocationPercentage,
    0,
  );
}

export function calculateCapacityStatus({
  effectiveCapacityPercentage,
  totalAllocationPercentage,
}: {
  effectiveCapacityPercentage: number;
  totalAllocationPercentage: number;
}): CapacityStatus {
  if (totalAllocationPercentage < effectiveCapacityPercentage) {
    return "available";
  }

  if (totalAllocationPercentage === effectiveCapacityPercentage) {
    return "at_capacity";
  }

  return "overcommitted";
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
