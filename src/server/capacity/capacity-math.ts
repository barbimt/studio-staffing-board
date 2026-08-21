export type CapacityStatus = "available" | "at_capacity" | "overcommitted";

export function roundCapacityPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateContractualCapacityPercentage(fte: number): number {
  return fte * 100;
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

export function previewMonthlyAllocation({
  effectiveCapacityPercentage,
  otherAllocationPercentage,
  draftAllocationPercentage,
}: {
  effectiveCapacityPercentage: number;
  otherAllocationPercentage: number;
  draftAllocationPercentage: number;
}) {
  const totalAllocationPercentage =
    otherAllocationPercentage + draftAllocationPercentage;
  const remainingCapacityPercentage = roundCapacityPercentage(
    effectiveCapacityPercentage - totalAllocationPercentage,
  );

  return {
    totalAllocationPercentage,
    remainingCapacityPercentage,
    status: calculateCapacityStatus({
      effectiveCapacityPercentage,
      totalAllocationPercentage,
    }),
  };
}
