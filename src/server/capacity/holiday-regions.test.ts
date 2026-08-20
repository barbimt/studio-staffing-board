import { describe, expect, it } from "vitest";

import { regionForCategory, regionForSite } from "./holiday-regions";

describe("regionForSite", () => {
  it("maps studio sites to holiday regions in one place", () => {
    expect(regionForSite("Bristol")).toBe("UK");
    expect(regionForSite("Porto")).toBe("PT");
    expect(regionForSite("London")).toBeNull();
  });
});

describe("regionForCategory", () => {
  it("maps holiday categories to the same region codes", () => {
    expect(regionForCategory("HOLIDAY-UK")).toBe("UK");
    expect(regionForCategory("HOLIDAY-PT")).toBe("PT");
    expect(regionForCategory("LEAVE")).toBeNull();
    expect(regionForCategory("CEREMONY")).toBeNull();
  });
});
