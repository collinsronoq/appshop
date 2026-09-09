import * as SecureStore from "expo-secure-store";

const TOKEN_ID_KEY = "household-shopping.push-token-id";
const PERMISSION_CONTEXT_KEY = "household-shopping.push-permission-context-seen";

export const pushStorage = {
  getTokenId: () => SecureStore.getItemAsync(TOKEN_ID_KEY),
  setTokenId: (id: string) => SecureStore.setItemAsync(TOKEN_ID_KEY, id),
  clearTokenId: () => SecureStore.deleteItemAsync(TOKEN_ID_KEY),
  hasSeenPermissionContext: async () =>
    (await SecureStore.getItemAsync(PERMISSION_CONTEXT_KEY)) === "true",
  markPermissionContextSeen: () => SecureStore.setItemAsync(PERMISSION_CONTEXT_KEY, "true")
};
