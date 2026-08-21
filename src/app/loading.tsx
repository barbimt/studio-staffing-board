import { StaffingBoardHeading } from "@/components/staffing/staffing-board-heading";
import { StaffingTableSkeleton } from "@/components/staffing/staffing-table-skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <p className="sr-only">Loading monthly staffing</p>
      <header>
        <StaffingBoardHeading />
        <div className="mt-6 flex items-center gap-3" aria-hidden="true">
          <span className="bg-muted size-8 rounded-lg motion-safe:animate-pulse" />
          <span className="bg-muted h-5 w-40 rounded-sm motion-safe:animate-pulse" />
          <span className="bg-muted size-8 rounded-lg motion-safe:animate-pulse" />
        </div>
      </header>
      <StaffingTableSkeleton />
    </main>
  );
}
