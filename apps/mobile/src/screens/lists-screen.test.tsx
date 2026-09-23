import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ListsScreen } from "./lists-screen";
import { listApi } from "../lists/api-client";
import { pushNotificationApi } from "../notifications/api-client";
import { tripApi } from "../trips/api-client";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("../auth/auth-context", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
jest.mock("../households/household-context", () => ({ useHouseholds: () => ({ selected: { id: "h1", name: "Kamau Home" } }) }));
jest.mock("../lists/api-client", () => ({ listApi: { lists: jest.fn() } }));
jest.mock("../notifications/api-client", () => ({ pushNotificationApi: { listPendingSubstitutions: jest.fn(), decide: jest.fn() } }));
jest.mock("../trips/api-client", () => ({ tripApi: { active: jest.fn() } }));

const mockedLists = jest.mocked(listApi.lists);
const mockedActive = jest.mocked(tripApi.active);
const mockedSubstitutions = jest.mocked(pushNotificationApi.listPendingSubstitutions);
const mockedDecide = jest.mocked(pushNotificationApi.decide);

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><ListsScreen /></QueryClientProvider>);
}

describe("ListsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLists.mockImplementation(async (_householdId, archived = false) => archived ? [
      { id: "l1", name: "Friday shopping", status: "active", version: 1, item_count: 4, created_at: "2026-09-20T00:00:00Z", updated_at: "2026-09-22T00:00:00Z" },
      { id: "l2", name: "Old list", status: "archived", version: 2, item_count: 2, created_at: "2026-08-20T00:00:00Z", updated_at: "2026-08-22T00:00:00Z" }
    ] : [{ id: "l1", name: "Friday shopping", status: "active", version: 1, item_count: 4, created_at: "2026-09-20T00:00:00Z", updated_at: "2026-09-22T00:00:00Z" }]);
    mockedActive.mockResolvedValue({ id: "t1", household_id: "h1", shopping_list_id: "l1", store_name: "Corner shop", status: "active", version: 1, started_at: "", progress: { total: 4, pending: 2, collected: 2, skipped: 0 }, items: [{ id: "ti1", shopping_list_item_id: "i1", status: "pending", name: "Milk", requested_quantity: 1 }] });
    mockedSubstitutions.mockResolvedValue([
      { id: "self", household_id: "h1", shopping_trip_id: "t1", trip_item_id: "ti1", requested_by_user_id: "me", proposed_name: "Self choice", proposed_brand: null, proposed_variant: null, proposed_size_value: null, proposed_size_unit: null, status: "pending", resolved_by_user_id: null, resolved_at: null },
      { id: "s1", household_id: "h1", shopping_trip_id: "t1", trip_item_id: "ti1", requested_by_user_id: "other", proposed_name: "Oat milk", proposed_brand: null, proposed_variant: null, proposed_size_value: null, proposed_size_unit: null, status: "pending", resolved_by_user_id: null, resolved_at: null }
    ]);
    mockedDecide.mockResolvedValue({ id: "s1", household_id: "h1", shopping_trip_id: "t1", trip_item_id: "ti1", requested_by_user_id: "other", proposed_name: "Oat milk", proposed_brand: null, proposed_variant: null, proposed_size_value: null, proposed_size_unit: null, status: "approved", resolved_by_user_id: "me", resolved_at: "" });
  });

  it("renders real active-trip progress and excludes requester self-approval", async () => {
    renderScreen();
    expect((await screen.findAllByText("2 of 4 collected")).length).toBeGreaterThan(0);
    expect(screen.getByText("Oat milk")).toBeTruthy();
    expect(screen.queryByText("Self choice")).toBeNull();
    fireEvent.press(screen.getAllByText("Resume trip")[0]!);
    expect(mockPush).toHaveBeenCalledWith("/trip/t1");
  });

  it("separates archived lists and submits the existing approval mutation", async () => {
    renderScreen();
    expect(await screen.findByText("Oat milk")).toBeTruthy();
    fireEvent.press(screen.getByText("Approve"));
    await waitFor(() => expect(mockedDecide).toHaveBeenCalledWith("h1", "s1", "approve"));
    fireEvent.press(screen.getByRole("tab", { name: "Archived" }));
    expect(await screen.findByText("Old list")).toBeTruthy();
    expect(screen.getByText("1 archived")).toBeTruthy();
    expect(screen.getAllByText("Friday shopping")).toHaveLength(1);
  });
});
