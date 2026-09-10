import { authApiClient } from "../auth/api-client";
import type { ShoppingList } from "./types";

const request = <T>(path: string, init?: RequestInit) => authApiClient.authenticatedRequest<T>(path, init);

export const listApi = {
  lists: (householdId: string, archived = false) =>
    authApiClient.authenticatedRequest<ShoppingList[]>(`/households/${householdId}/shopping-lists${archived ? "?archived=true" : ""}`),
  get: (householdId: string, listId: string) =>
    request<ShoppingList>(`/households/${householdId}/shopping-lists/${listId}`),
  create: (householdId: string, name: string) =>
    request<ShoppingList>(`/households/${householdId}/shopping-lists`, {
      method: "POST",
      body: JSON.stringify({ name })
    }),
  rename: (householdId: string, listId: string, name: string) =>
    request<ShoppingList>(`/households/${householdId}/shopping-lists/${listId}`, {
      method: "PATCH",
      body: JSON.stringify({ name })
    }),
  addItem: (householdId: string, listId: string, data: unknown) =>
    request<ShoppingList>(`/households/${householdId}/shopping-lists/${listId}/items`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
  updateItem: (householdId: string, listId: string, itemId: string, data: unknown) =>
    request<ShoppingList>(`/households/${householdId}/shopping-lists/${listId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    }),
  removeItem: (householdId: string, listId: string, itemId: string) =>
    request<ShoppingList>(`/households/${householdId}/shopping-lists/${listId}/items/${itemId}`, {
      method: "DELETE"
    }),
  archive: (householdId: string, listId: string) =>
    request<ShoppingList>(`/households/${householdId}/shopping-lists/${listId}`, { method: "DELETE" })
};
