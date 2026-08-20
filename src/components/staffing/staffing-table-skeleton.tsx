export function StaffingTableSkeleton() {
  const rows = Array.from({ length: 8 }, (_, index) => index);

  return (
    <div className="mt-8 overflow-x-auto" aria-hidden="true">
      <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-border border-b">
            {["Person", "Site", "Projects", "Capacity", "Status"].map(
              (header) => (
                <th
                  key={header}
                  scope="col"
                  className="text-muted-foreground px-3 py-2 font-medium"
                >
                  {header}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row} className="border-border/80 border-b">
              {Array.from({ length: 5 }, (_, cell) => (
                <td key={cell} className="px-3 py-3">
                  <span className="bg-muted block h-4 w-24 rounded-sm motion-safe:animate-pulse" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
