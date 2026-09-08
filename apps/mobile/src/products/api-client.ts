import { authApiClient } from "../auth/api-client";
import type { HouseholdProduct, ProductCategory } from "./types";
export const productApi = {
  list: (id: string, params = "") => authApiClient.authenticatedRequest<HouseholdProduct[]>(`/households/${id}/products${params}`),
  get: (householdId: string, id: string) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${householdId}/products/${id}`),
  categories: () => authApiClient.authenticatedRequest<ProductCategory[]>("/product-categories"),
  create: (id: string, data: unknown) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${id}/products`, { method: "POST", body: JSON.stringify(data) }),
  update: (householdId: string, id: string, data: unknown) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${householdId}/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  archive: (householdId: string, id: string) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${householdId}/products/${id}`, { method: "DELETE" })
};
