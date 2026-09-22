import { localProductImage } from "./product-images";

describe("local product image matching", () => {
  it.each(["Bread", "Sourdough loaf", "Whole milk 2L", "Tomatoes", "6 eggs", "Laundry detergent"])("matches a confident common product: %s", (name) => {
    expect(localProductImage(name)).toBeDefined();
  });

  it.each(["Milk chocolate", "Tomato sauce", "Milky cleanser", "Egg noodles", "Breadth report"])("does not guess from ambiguous product text: %s", (name) => {
    expect(localProductImage(name)).toBeUndefined();
  });

  it("uses the household category only as a category fallback", () => {
    expect(localProductImage("Unknown item", "household")).toBeDefined();
    expect(localProductImage("Unknown item", "produce")).toBeUndefined();
  });

  it("does not treat a generic grocery list name as household cleaning", () => {
    expect(localProductImage("Grocery list")).toBeUndefined();
    expect(localProductImage("Grocery list", "household")).toBeUndefined();
  });

  it("can resolve a confidently named list item", () => {
    expect(localProductImage("Milk run")).toBeDefined();
  });
});
