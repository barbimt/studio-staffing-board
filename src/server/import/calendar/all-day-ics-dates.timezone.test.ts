import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ALL_DAY_ICS_CASES } from "./all-day-ics-cases";

const worker = fileURLToPath(
  new URL("./all-day-ics-dates.worker.ts", import.meta.url),
);
const tsxCli = fileURLToPath(import.meta.resolve("tsx/cli"));

const timezones = ["UTC", "Europe/Lisbon", "America/Los_Angeles"] as const;

describe("all-day VALUE=DATE fixtures across host timezones", () => {
  it.each(timezones)(
    "keeps exclusive DTEND calendar dates in %s",
    (timeZone) => {
      const result = spawnSync(process.execPath, [tsxCli, worker], {
        env: { ...process.env, TZ: timeZone },
        encoding: "utf8",
      });

      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr || result.stdout).toBe(0);

      const payload = JSON.parse(result.stdout) as {
        tz: string;
        resolvedTimeZone: string;
        report: {
          fixture: string;
          startDate: string;
          exclusiveEndDate: string;
          ok: boolean;
        }[];
      };

      expect(payload.tz).toBe(timeZone);
      expect(payload.report).toHaveLength(ALL_DAY_ICS_CASES.length);

      for (const [index, expected] of ALL_DAY_ICS_CASES.entries()) {
        expect(payload.report[index]).toMatchObject({
          fixture: expected.fixture,
          startDate: expected.startDate,
          exclusiveEndDate: expected.exclusiveEndDate,
          ok: true,
        });
      }
    },
  );
});
