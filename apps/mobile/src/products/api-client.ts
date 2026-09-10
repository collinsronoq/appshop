import { authApiClient } from "../auth/api-client";
import type { HouseholdProduct, ProductCategory } from "./types";
export const productApi = {
  list: (id: string, params = "") => authApiClient.authenticatedRequest<HouseholdProduct[]>(`/households/${id}/products${params}`),
  listFiltered: (id: string, query: string, category?: string, archived = false) => {
    const params = new URLSearchParams(); if (query) params.set("query", query); if (category) params.set("category", category); if (archived) params.set("archived", "true");
    const suffix = params.toString(); return authApiClient.authenticatedRequest<HouseholdProduct[]>(`/households/${id}/products${suffix ? `?${suffix}` : ""}`);
  },
  get: (householdId: string, id: string) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${householdId}/products/${id}`),
  categories: () => authApiClient.authenticatedRequest<ProductCategory[]>("/product-categories"),
  create: (id: string, data: unknown) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${id}/products`, { method: "POST", body: JSON.stringify(data) }),
  update: (householdId: string, id: string, data: unknown) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${householdId}/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  substitutes: (householdId: string, id: string, substitutes: unknown[]) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${householdId}/products/${id}/substitutes`, { method: "PUT", body: JSON.stringify({ substitutes }) }),
  archive: (householdId: string, id: string) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${householdId}/products/${id}`, { method: "DELETE" })
};
