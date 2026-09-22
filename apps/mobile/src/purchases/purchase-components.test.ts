import { purchaseCountLabel } from "./purchase-components";

describe("purchaseCountLabel", () => {
  it("uses correct singular and plural purchase copy", () => {
    expect(purchaseCountLabel(1)).toBe("Bought once");
    expect(purchaseCountLabel(2)).toBe("Bought 2 times");
  });
});
