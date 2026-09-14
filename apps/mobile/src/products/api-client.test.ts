import { authApiClient } from "../auth/api-client";
import { productApi } from "./api-client";
import type { HouseholdProduct } from "./types";

jest.mock("../auth/api-client", () => ({
  authApiClient: { authenticatedRequest: jest.fn() }
}));

const product = (id: string, archived = false): HouseholdProduct => ({
  id,
  household_id: "household-a",
  name: id,
  usual_quantity: 1,
  archived_at: archived ? "2026-09-14T10:00:00Z" : null
});

describe("product API client", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns only archived products for the archived catalogue view", async () => {
    jest.mocked(authApiClient.authenticatedRequest).mockResolvedValue([
      product("active"),
      product("archived", true)
    ]);

    await expect(productApi.listFiltered("household-a", "", undefined, true)).resolves.toEqual([
      expect.objectContaining({ id: "archived" })
    ]);
    expect(authApiClient.authenticatedRequest).toHaveBeenCalledWith(
      "/households/household-a/products?archived=true"
    );
  });
});
