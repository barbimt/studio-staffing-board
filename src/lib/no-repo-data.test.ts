import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("repository data workflow", () => {
  it("does not keep a production data/ directory", () => {
    expect(existsSync(path.join(process.cwd(), "data"))).toBe(false);
  });
});
