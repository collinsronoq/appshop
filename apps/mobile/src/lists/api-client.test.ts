import { listApi } from "./api-client";
import { authApiClient } from "../auth/api-client";

jest.mock("../auth/api-client", () => ({
  authApiClient: { authenticatedRequest: jest.fn(async (path: string) => ({ path })) }
}));

describe("shopping list API client", () => {
  it("keeps list and item requests household-scoped", async () => {
    await listApi.lists("household-a");
    await listApi.addItem("household-a", "list-1", {
      household_product_id: "product-1",
      requested_quantity: 2
    });
    expect(authApiClient.authenticatedRequest).toHaveBeenNthCalledWith(
      1,
      "/households/household-a/shopping-lists"
    );
    expect(authApiClient.authenticatedRequest).toHaveBeenNthCalledWith(
      2,
      "/households/household-a/shopping-lists/list-1/items",
      expect.objectContaining({ method: "POST" })
    );
  });
});
