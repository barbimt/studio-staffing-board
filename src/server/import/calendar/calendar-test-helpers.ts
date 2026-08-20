import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function readCalendarFixture(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)),
    "utf8",
  );
}

export function readSourceFile(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../../data/${name}`, import.meta.url)),
    "utf8",
  );
}
