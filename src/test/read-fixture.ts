import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function readFixture(moduleUrl: string, name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`./fixtures/${name}`, moduleUrl)),
    "utf8",
  );
}
