import { authApiClient } from "../auth/api-client";
import { productApi, resolveProductImageUrl } from "./api-client";
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

  it("sends product images as multipart form data", async () => {
    jest.mocked(authApiClient.authenticatedRequest).mockResolvedValue(product("product-a"));

    await productApi.uploadImage("household-a", "product-a", {
      uri: "file:///tmp/product.png",
      fileName: "product.png",
      mimeType: "image/png"
    });

    expect(authApiClient.authenticatedRequest).toHaveBeenCalledWith(
      "/households/household-a/products/product-a/image",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) })
    );
  });

  it("resolves backend-relative product image URLs", () => {
    expect(resolveProductImageUrl("/api/v1/product-images/example.png")).toBe(
      "http://localhost:8000/api/v1/product-images/example.png"
    );
    expect(resolveProductImageUrl("https://cdn.example/image.png")).toBe(
      "https://cdn.example/image.png"
    );
  });
});
