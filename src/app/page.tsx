import { count } from "drizzle-orm";
import { connection } from "next/server";

import { StaffingBoard } from "@/components/staffing/staffing-board";
import { getMonthlyCapacity } from "@/server/capacity/get-monthly-capacity";
import { resolveYearMonth } from "@/server/capacity/month";
import { getDb, people } from "@/server/db";

export default async function Home({ searchParams }: PageProps<"/">) {
  await connection();

  const { month: monthParam } = await searchParams;
  const month = resolveYearMonth(monthParam);
  const db = getDb();

  const [peopleCount] = await db.select({ count: count() }).from(people);
  const hasStaffingData = Number(peopleCount?.count ?? 0) > 0;
  const monthlyPeople = hasStaffingData
    ? await getMonthlyCapacity(db, month)
    : [];

  return (
    <StaffingBoard
      month={month}
      hasStaffingData={hasStaffingData}
      people={monthlyPeople}
    />
  );
}
