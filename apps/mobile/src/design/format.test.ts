import { formatNumber, formatQuantity, formatSize } from "./format";

describe("display number formatting", () => {
  it("removes insignificant decimal zeros", () => {
    expect(formatNumber("500.000")).toBe("500");
    expect(formatQuantity("4.000")).toBe("4");
  });

  it("preserves meaningful decimal precision and unit spacing", () => {
    expect(formatSize("2.250", "L")).toBe("2.25 L");
    expect(formatSize(1.5, "kg")).toBe("1.5 kg");
  });
});
