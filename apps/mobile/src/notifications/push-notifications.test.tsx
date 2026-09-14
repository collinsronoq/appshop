import type { ReactNode } from "react";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";

import { AuthApiClient, type AuthClient } from "../auth/api-client";
import { AuthProvider } from "../auth/auth-context";
import type { LoginInput, RegisterInput, User } from "../auth/types";
import { HouseholdApiClient } from "../households/api-client";
import { HouseholdProvider } from "../households/household-context";
import { PushNotificationApiClient, pushNotificationApi } from "./api-client";
import { NotificationCoordinator } from "./notification-coordinator";
import { registerDeviceForPush, type NotificationRegistrationAdapter } from "./registration";
import { ShoppingModeScreen } from "../screens/shopping-mode-screen";
import { tripApi } from "../trips/api-client";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn()
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY"
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined)
}));
jest.mock("../realtime/use-shopping-list-realtime", () => ({
  useShoppingListRealtime: jest.fn()
}));

const mockedNotifications = jest.mocked(Notifications);
const mockedSecureStore = jest.mocked(SecureStore);
const expoToken = "ExponentPushToken[test-device-0123456789]";
const user: User = {
  id: "1f9d3b3e-358a-4acb-97da-fd925ab98db1",
  email: "push@example.com",
  display_name: "Push User",
  status: "active",
  created_at: "2026-09-09T10:00:00Z"
};

function response(status: number, body?: object): Response {
  return { ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(body ?? {}) } as unknown as Response;
}

class FakeClient implements AuthClient {
  requests: { path: string; init?: RequestInit }[] = [];
  async restore() { return user; }
  async login(_input: LoginInput) { return user; }
  async register(_input: RegisterInput) { return user; }
  async logout() { return; }
  async authenticatedRequest<T>(path: string, init?: RequestInit) {
    this.requests.push({ path, init });
    if (path === "/households") {
      return [{ id: "household-b", name: "Home B", role: "member", member_count: 2, created_at: "2026-09-09T10:00:00Z" }] as T;
    }
    if (path === "/push-tokens") {
      return { id: "token-row", provider: "expo", platform: "android", device_id: null, enabled: true, last_registered_at: "", created_at: "" } as T;
    }
    throw new Error(`Unexpected request: ${path}`);
  }
}

function wrapper(client: FakeClient, child: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider client={client}>
        <HouseholdProvider client={new HouseholdApiClient(client)}>{child}</HouseholdProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("push notification lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);
    mockedNotifications.getPermissionsAsync.mockResolvedValue({ status: "granted" } as never);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({ status: "granted" } as never);
    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({ type: "expo", data: expoToken } as never);
    mockedNotifications.getLastNotificationResponseAsync.mockResolvedValue(null);
  });

  it("registers the Expo token after permission is granted without credentials in the payload", async () => {
    const client = new FakeClient();
    const api = new PushNotificationApiClient(client);
    await registerDeviceForPush(api, mockedNotifications as NotificationRegistrationAdapter, "android");
    const registration = client.requests[0]!;
    expect(registration.path).toBe("/push-tokens");
    expect(JSON.parse(String(registration.init?.body))).toEqual({
      provider: "expo", token: expoToken, platform: "android", device_id: null
    });
    expect(String(registration.init?.body)).not.toContain("access_token");
  });

  it("continues without registration when permission is denied", async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({ status: "denied", canAskAgain: false } as never);
    const client = new FakeClient();
    await expect(registerDeviceForPush(
      new PushNotificationApiClient(client),
      mockedNotifications as NotificationRegistrationAdapter,
      "ios"
    )).resolves.toBeNull();
    expect(client.requests).toHaveLength(0);
    expect(mockedNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("requests permission when Android initially reports denied but can ask again", async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({ status: "denied", canAskAgain: true } as never);
    const client = new FakeClient();
    await registerDeviceForPush(
      new PushNotificationApiClient(client),
      mockedNotifications as NotificationRegistrationAdapter,
      "android"
    );
    expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(client.requests[0]?.path).toBe("/push-tokens");
  });

  it("reconciles registration when the native push token changes", async () => {
    const registerSpy = jest.spyOn(pushNotificationApi, "register").mockResolvedValue({
      id: "token-row", provider: "expo", platform: "android", device_id: null,
      enabled: true, last_registered_at: "", created_at: ""
    });
    wrapper(new FakeClient(), <NotificationCoordinator />);
    await waitFor(() => expect(mockedNotifications.addPushTokenListener).toHaveBeenCalled());
    const listener = mockedNotifications.addPushTokenListener.mock.calls[0]![0];
    listener({ type: "android", data: "native-token" });
    await waitFor(() => expect(registerSpy).toHaveBeenCalledTimes(2));
  });

  it("waits for restored auth and household membership before cold-start navigation", async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({ status: "denied" } as never);
    mockedNotifications.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: {
        type: "substitution.requested", household_id: "household-b",
        trip_id: "trip-1", substitution_id: "substitution-1"
      } } } }
    } as never);
    const client = new FakeClient();
    wrapper(client, <NotificationCoordinator />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/substitutions/substitution-1"));
    expect(client.requests.some(({ path }) => path === "/households")).toBe(true);
  });

  it("attempts device cleanup but still clears local state when unregister fails", async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
    fetchMock.mockResolvedValueOnce(response(200, {
      user, access_token: "access", refresh_token: "refresh", token_type: "bearer", expires_in: 900
    }));
    const client = new AuthApiClient("http://api.test/api/v1");
    await client.login({ email: user.email, password: "correct horse battery staple" });
    mockedSecureStore.getItemAsync.mockImplementation(async (key) =>
      key === "household-shopping.push-token-id" ? "token-row" : null
    );
    fetchMock.mockRejectedValueOnce(new Error("push unregister unavailable"));
    fetchMock.mockResolvedValueOnce(response(204));
    await expect(client.logout()).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.some(([url, init]) =>
      String(url).endsWith("/push-tokens/token-row") && init?.method === "DELETE"
    )).toBe(true);
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith("household-shopping.push-token-id");
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith("household-shopping.refresh-token");
  });

  it("renders fetched approved state instead of stale pending notification controls", async () => {
    jest.spyOn(tripApi, "get").mockResolvedValue({
      id: "trip-1", household_id: "household-b", shopping_list_id: "list-1",
      status: "active", version: 2, started_at: "2026-09-09T10:00:00Z",
      progress: { total: 1, pending: 1, collected: 0, skipped: 0 },
      items: [{ id: "item-1", shopping_list_item_id: "source-1", status: "pending", name: "Fresh Fri", requested_quantity: 1 }]
    });
    jest.spyOn(pushNotificationApi, "getSubstitution").mockResolvedValue({
      id: "substitution-1", household_id: "household-b", shopping_trip_id: "trip-1",
      trip_item_id: "item-1", requested_by_user_id: "another-user",
      proposed_name: "Golden Fry", proposed_brand: null, proposed_variant: null,
      proposed_size_value: 5, proposed_size_unit: "L", status: "approved",
      resolved_by_user_id: user.id, resolved_at: "2026-09-09T10:01:00Z"
    });
    wrapper(new FakeClient(), <ShoppingModeScreen tripId="trip-1" substitutionId="substitution-1" />);
    expect(await screen.findByText("Replacement approved")).toBeTruthy();
    expect(screen.queryByText("Approve")).toBeNull();
    expect(pushNotificationApi.getSubstitution).toHaveBeenCalledWith("household-b", "substitution-1");
  });
});
