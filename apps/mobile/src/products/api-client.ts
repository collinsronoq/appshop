import { authApiClient } from "../auth/api-client";
import type { HouseholdProduct, ProductCategory } from "./types";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
export type ProductImageUpload = { uri: string; fileName?: string | null; mimeType?: string | null };

export function resolveProductImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

export const productApi = {
  list: (id: string, params = "") => authApiClient.authenticatedRequest<HouseholdProduct[]>(`/households/${id}/products${params}`),
  listFiltered: async (id: string, query: string, category?: string, archived = false) => {
    const params = new URLSearchParams(); if (query) params.set("query", query); if (category) params.set("category", category); if (archived) params.set("archived", "true");
    const suffix = params.toString(); const products = await authApiClient.authenticatedRequest<HouseholdProduct[]>(`/households/${id}/products${suffix ? `?${suffix}` : ""}`);
    return archived ? products.filter((product) => Boolean(product.archived_at)) : products;
  },
  get: (householdId: string, id: string) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${householdId}/products/${id}`),
  categories: () => authApiClient.authenticatedRequest<ProductCategory[]>("/product-categories"),
  create: (id: string, data: unknown) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${id}/products`, { method: "POST", body: JSON.stringify(data) }),
  update: (householdId: string, id: string, data: unknown) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${householdId}/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  uploadImage: (householdId: string, id: string, image: ProductImageUpload) => {
    const body = new FormData();
    body.append("file", {
      uri: image.uri,
      name: image.fileName ?? `product-${id}.jpg`,
      type: image.mimeType ?? "image/jpeg"
    } as unknown as Blob);
    return authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${householdId}/products/${id}/image`, { method: "POST", body });
  },
  substitutes: (householdId: string, id: string, substitutes: unknown[]) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${householdId}/products/${id}/substitutes`, { method: "PUT", body: JSON.stringify({ substitutes }) }),
  archive: (householdId: string, id: string) => authApiClient.authenticatedRequest<HouseholdProduct>(`/households/${householdId}/products/${id}`, { method: "DELETE" })
};
