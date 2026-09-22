import { render, screen } from "@testing-library/react-native";

import { ProductCard } from "./product-components";

describe("ProductCard", () => {
  it("keeps long category and quantity metadata readable and uses detail navigation", () => {
    render(<ProductCard layout="grid" onPress={jest.fn()} product={{
      id: "p1",
      household_id: "h1",
      name: "Whole milk",
      brand: "Freshfields",
      variant: "Full cream family bottle",
      size_value: 2,
      size_unit: "L",
      usual_quantity: 12,
      category: { id: "c1", slug: "dairy", display_name: "Fresh dairy and refrigerated products", sort_order: 1 }
    }} />);

    expect(screen.getByText("Fresh dairy and refrigerated products")).toBeTruthy();
    expect(screen.getByText("Usually buy 12")).toBeTruthy();
    expect(screen.getByText("chevron-right", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText("arrow-up-right", { includeHiddenElements: true })).toBeNull();
  });
});
