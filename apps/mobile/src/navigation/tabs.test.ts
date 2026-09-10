import { TAB_ITEMS } from "./tabs";

describe("authenticated bottom navigation", () => {
  it("exposes the five product destinations in priority order", () => {
    expect(TAB_ITEMS.map(({ title }) => title)).toEqual([
      "Home",
      "Lists",
      "Products",
      "History",
      "Profile"
    ]);
    expect(new Set(TAB_ITEMS.map(({ icon }) => icon)).size).toBe(5);
  });
});
