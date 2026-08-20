export const LEAVE_CATEGORY = "LEAVE";

const HOLIDAY_REGION_BY_CATEGORY: Record<string, string> = {
  "HOLIDAY-UK": "UK",
  "HOLIDAY-PT": "PT",
};

const HOLIDAY_REGION_BY_SITE: Record<string, string> = {
  Bristol: "UK",
  Porto: "PT",
};

export function regionForCategory(category: string): string | null {
  return HOLIDAY_REGION_BY_CATEGORY[category] ?? null;
}

export function regionForSite(site: string): string | null {
  return HOLIDAY_REGION_BY_SITE[site] ?? null;
}
