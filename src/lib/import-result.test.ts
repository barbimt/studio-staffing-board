import { describe, expect, it } from "vitest";

import { parseStudioImportResult } from "./import-result";

describe("parseStudioImportResult", () => {
  it("accepts a successful payload", () => {
    expect(parseStudioImportResult({ ok: true })).toEqual({ ok: true });
  });

  it("accepts a grouped failure payload", () => {
    expect(
      parseStudioImportResult({ ok: false, errors: { people: ["bad"] } }),
    ).toEqual({ ok: false, errors: { people: ["bad"] } });
  });

  it("rejects malformed payloads", () => {
    expect(parseStudioImportResult(null)).toBeUndefined();
    expect(parseStudioImportResult({ ok: "yes" })).toBeUndefined();
  });
});
