import { readFixture } from "@/test/read-fixture";

export function readCalendarFixture(name: string): string {
  return readFixture(import.meta.url, name);
}
