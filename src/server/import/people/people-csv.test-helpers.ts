import { readFixture } from "@/test/read-fixture";

export function readPeopleFixture(name: string): string {
  return readFixture(import.meta.url, name);
}
