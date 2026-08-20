import { getMonthlyCapacity } from "../src/server/capacity/get-monthly-capacity";
import {
  MonthlyCapacityError,
  parseYearMonth,
} from "../src/server/capacity/month";
import { createDb } from "../src/server/db/client";

async function main() {
  const month = process.argv[2];

  if (!month) {
    console.error("Usage: pnpm capacity 2026-09");
    process.exitCode = 1;
    return;
  }

  const bounds = parseYearMonth(month);
  const db = createDb();

  try {
    const results = await getMonthlyCapacity(db, month);

    console.log(`${month}  (${bounds.monthStart} → ${bounds.monthEnd})`);
    console.log(`${results.length} people`);
    console.log("");

    for (const row of results) {
      const personName = `${row.person.firstName} ${row.person.lastName}`;
      console.log(
        `${personName}  fte=${row.person.fte}  contractual=${row.contractualCapacityPercentage}  allocation=${row.totalAllocation}  remaining=${row.remainingCapacity}  ${row.status}`,
      );

      if (row.projects.length === 0) {
        console.log("  (no active projects)");
        continue;
      }

      for (const project of row.projects) {
        console.log(`  ${project.name} ${project.allocationPercentage}%`);
      }
    }
  } finally {
    await db.$client.end();
  }
}

main().catch((error) => {
  if (error instanceof MonthlyCapacityError) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  console.error(
    error instanceof Error ? error.message : "Monthly capacity query failed",
  );
  process.exitCode = 1;
});
