export const staffingColumnHeader = {
  person: "Person",
  site: "Site",
  projects: "Projects",
  capacity: "Capacity",
  status: "Status",
} as const;

export const staffingColumnHeaders = [
  staffingColumnHeader.person,
  staffingColumnHeader.site,
  staffingColumnHeader.projects,
  staffingColumnHeader.capacity,
  staffingColumnHeader.status,
];

export const staffingTableFrameClassName =
  "border-border bg-background mt-8 overflow-x-auto rounded-xl border";

export const staffingTableHeaderClassName =
  "text-muted-foreground border-border border-r px-4 py-3 text-xs font-medium tracking-wider uppercase last:border-r-0";
