import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { listApi } from "../lists/api-client";
import { pushNotificationApi } from "../notifications/api-client";
import { productApi } from "../products/api-client";
import { tripApi } from "../trips/api-client";
import type { ShoppingTrip } from "../trips/types";
import { canCompleteTrip, ShoppingModeScreen } from "./shopping-mode-screen";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }) }));
jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return { ...actual, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 18, left: 0 }) };
});
jest.mock("../auth/auth-context", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
jest.mock("../households/household-context", () => ({ useHouseholds: () => ({ selected: { id: "h1" } }) }));
jest.mock("../realtime/use-shopping-list-realtime", () => ({ useShoppingListRealtime: jest.fn() }));
jest.mock("../trips/api-client", () => ({ tripApi: { get: jest.fn(), collect: jest.fn(), skip: jest.fn(), undo: jest.fn(), complete: jest.fn(), cancel: jest.fn() } }));
jest.mock("../lists/api-client", () => ({ listApi: { get: jest.fn() } }));
jest.mock("../products/api-client", () => ({ productApi: { get: jest.fn() } }));
jest.mock("../products/product-images", () => {
  const { Text } = jest.requireActual("react-native");
  return { ProductArtwork: ({ name }: { name: string }) => <Text>{name} image</Text> };
});
jest.mock("../notifications/api-client", () => ({ pushNotificationApi: { listPendingSubstitutions: jest.fn(), getSubstitution: jest.fn() } }));

const pendingTrip: ShoppingTrip = {
  id: "t1", household_id: "h1", shopping_list_id: "l1", store_name: "Corner shop", status: "active", version: 1, started_at: "2026-09-23T08:30:00Z",
  progress: { total: 3, pending: 1, collected: 1, skipped: 1 },
  items: [
    { id: "i1", shopping_list_item_id: "s1", status: "pending", name: "A very long milk product name", requested_quantity: 2, notes: "Low fat if available" },
    { id: "i2", shopping_list_item_id: "s2", status: "collected", name: "Bread", requested_quantity: 1 },
    { id: "i3", shopping_list_item_id: "s3", status: "skipped", name: "Eggs", requested_quantity: 1 }
  ]
};

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><ShoppingModeScreen tripId="t1" /></QueryClientProvider>);
}

describe("ShoppingModeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(tripApi.get).mockResolvedValue(pendingTrip);
    jest.mocked(listApi.get).mockResolvedValue({ id: "l1", name: "Friday shop", status: "active", version: 1, item_count: 3, created_at: "", updated_at: "", items: pendingTrip.items.map((item, position) => ({ id: item.shopping_list_item_id, household_product_id: `p${position + 1}`, name: item.name, requested_quantity: item.requested_quantity, notes: item.notes, position })) });
    jest.mocked(productApi.get).mockImplementation(async (_household, id) => ({ id, household_id: "h1", name: id, usual_quantity: 1 }));
    jest.mocked(pushNotificationApi.listPendingSubstitutions).mockResolvedValue([{ id: "sub1", household_id: "h1", shopping_trip_id: "t1", trip_item_id: "i1", requested_by_user_id: "other", proposed_name: "Oat milk", proposed_brand: null, proposed_variant: null, proposed_size_value: 1, proposed_size_unit: "L", status: "pending", resolved_by_user_id: null, resolved_at: null }]);
    jest.mocked(tripApi.collect).mockResolvedValue(pendingTrip);
    jest.mocked(tripApi.complete).mockResolvedValue({});
  });

  it("preserves item order and keeps pending, collected, skipped, and substitution actions distinct", async () => {
    const view = renderScreen();
    expect((await screen.findAllByText("Friday shop")).length).toBeGreaterThan(0);
    expect(screen.getByText("Approval needed")).toBeTruthy();
    expect(screen.getByText("Oat milk")).toBeTruthy();
    expect(screen.getByText("Collected")).toBeTruthy();
    expect(screen.getByText("Skipped")).toBeTruthy();
    const tree = JSON.stringify(view.toJSON());
    expect(tree.indexOf("A very long milk product name")).toBeLessThan(tree.indexOf("Bread"));
    expect(tree.indexOf("Bread")).toBeLessThan(tree.indexOf("Eggs"));

    fireEvent.press(screen.getByText("Mark collected"));
    await waitFor(() => expect(tripApi.collect).toHaveBeenCalledWith("h1", "t1", "i1"));
    fireEvent.press(screen.getByText("Unavailable"));
    expect(mockPush).toHaveBeenCalledWith("/trip/t1/items/i1/unavailable");
    expect(screen.getByText("Resolve 1 to finish")).toBeDisabled();
  });

  it("only offers completion after every item is resolved", async () => {
    expect(canCompleteTrip(pendingTrip.items)).toBe(false);
    const resolved = { ...pendingTrip, progress: { total: 2, pending: 0, collected: 1, skipped: 1 }, items: pendingTrip.items.slice(1) };
    expect(canCompleteTrip(resolved.items)).toBe(true);
    jest.mocked(tripApi.get).mockResolvedValue(resolved);
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    renderScreen();
    fireEvent.press(await screen.findByText("Complete trip"));
    const actions = alert.mock.calls[0]?.[2];
    await act(async () => { await actions?.[1]?.onPress?.(); });
    await waitFor(() => expect(tripApi.complete).toHaveBeenCalledWith("h1", "t1"));
    expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)/lists");
    alert.mockRestore();
  });
});
