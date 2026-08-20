import type { MonthlyPersonCapacity } from "@/server/capacity/calculate-capacity";

function remainingCopy(remainingCapacity: number): string | null {
  if (remainingCapacity > 0) {
    return `${remainingCapacity}% available`;
  }

  if (remainingCapacity < 0) {
    return `${Math.abs(remainingCapacity)}% over`;
  }

  return null;
}

export function CapacitySummary({
  totalAllocation,
  contractualCapacityPercentage,
  remainingCapacity,
}: Pick<
  MonthlyPersonCapacity,
  "totalAllocation" | "contractualCapacityPercentage" | "remainingCapacity"
>) {
  const remaining = remainingCopy(remainingCapacity);

  return (
    <div className="flex flex-col gap-0.5">
      <span>{totalAllocation}% allocated</span>
      <span className="text-muted-foreground">
        {contractualCapacityPercentage}% capacity
      </span>
      {remaining ? (
        <span className="text-foreground font-medium">{remaining}</span>
      ) : null}
    </div>
  );
}
