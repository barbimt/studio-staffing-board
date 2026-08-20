export const staffingColumnHeader = {
  person: "Person",
  site: "Site",
  projects: "Projects",
  capacity: "Capacity",
  status: "Status",
} as const;

export const staffingColumnDefaults = {
  person: { size: 190, minSize: 150, enableResizing: false },
  site: { size: 120, minSize: 80, enableResizing: false },
  projects: { size: 250, minSize: 140, enableResizing: true },
  capacity: { size: 250, minSize: 200, enableResizing: true },
  status: { size: 200, minSize: 180, enableResizing: false },
} as const;

export const staffingColumnIds = [
  "person",
  "site",
  "projects",
  "capacity",
  "status",
] as const;

export const staffingTableMinWidth = staffingColumnIds.reduce(
  (total, id) => total + staffingColumnDefaults[id].size,
  0,
);
