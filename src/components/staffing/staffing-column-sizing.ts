export const STAFFING_COLUMN_SIZING_KEY =
  "studio-capacity.staffing-column-sizing";

export const COLUMN_RESIZE_STEP = 16;
export const COLUMN_RESIZE_STEP_LARGE = 48;

export type StaffingColumnSizing = Record<string, number>;

export function parseStaffingColumnSizing(
  raw: string | null,
): StaffingColumnSizing {
  if (!raw) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const sizing: StaffingColumnSizing = {};

    for (const [columnId, size] of Object.entries(parsed)) {
      if (typeof size === "number" && Number.isFinite(size) && size > 0) {
        sizing[columnId] = size;
      }
    }

    return sizing;
  } catch {
    return {};
  }
}

export function readStaffingColumnSizing(): StaffingColumnSizing {
  if (typeof window === "undefined") {
    return {};
  }

  return parseStaffingColumnSizing(
    window.localStorage.getItem(STAFFING_COLUMN_SIZING_KEY),
  );
}

export function writeStaffingColumnSizing(sizing: StaffingColumnSizing): void {
  window.localStorage.setItem(
    STAFFING_COLUMN_SIZING_KEY,
    JSON.stringify(sizing),
  );
}

export function nextColumnSize(
  current: number,
  delta: number,
  minSize: number,
  maxSize: number,
): number {
  return Math.min(maxSize, Math.max(minSize, current + delta));
}
