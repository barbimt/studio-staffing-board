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
  totalAllocation: number;
  remainingCapacity: number;
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

export function calculateTotalAllocation(
  assignments: { allocationPercentage: number }[],
): number {
  return assignments.reduce(
    (total, assignment) => total + assignment.allocationPercentage,
    0,
  );
}

export function calculateCapacityStatus({
  contractualCapacityPercentage,
  totalAllocation,
}: {
  contractualCapacityPercentage: number;
  totalAllocation: number;
}): CapacityStatus {
  if (totalAllocation < contractualCapacityPercentage) {
    return "available";
  }

  if (totalAllocation === contractualCapacityPercentage) {
    return "at_capacity";
  }

  return "overcommitted";
}

export function buildMonthlyPersonCapacity(
  person: CapacityPerson,
  projects: CapacityProject[],
): MonthlyPersonCapacity {
  const contractualCapacityPercentage = calculateContractualCapacityPercentage(
    person.fte,
  );
  const totalAllocation = calculateTotalAllocation(projects);
  const remainingCapacity = contractualCapacityPercentage - totalAllocation;

  return {
    person,
    projects,
    contractualCapacityPercentage,
    totalAllocation,
    remainingCapacity,
    status: calculateCapacityStatus({
      contractualCapacityPercentage,
      totalAllocation,
    }),
  };
}
