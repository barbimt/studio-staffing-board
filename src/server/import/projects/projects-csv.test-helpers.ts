import { readFixture } from "@/test/read-fixture";

export function readProjectsFixture(name: string): string {
  return readFixture(import.meta.url, name);
}
