import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { HomeScreen } from "./home-screen";
import { AppShellProvider, AppTopBar } from "../design/components";
import { listApi } from "../lists/api-client";
import { memoryApi } from "../memory/api-client";
import { pushNotificationApi } from "../notifications/api-client";
import { tripApi } from "../trips/api-client";
import type { HouseholdSummary } from "../households/types";

const mockPush = jest.fn();
let mockHousehold: HouseholdSummary = { id: "h1", name: "Kamau Home", role: "owner", member_count: 2, created_at: "2026-09-01T00:00:00Z" };

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }) }));
jest.mock("../auth/auth-context", () => ({ useAuth: () => ({ user: { id: "me", display_name: "Jane", email: "jane@example.com" } }) }));
jest.mock("../households/household-context", () => ({
  useHouseholds: () => ({ loading: false, households: [mockHousehold], selected: mockHousehold })
}));
jest.mock("../lists/api-client", () => ({ listApi: { lists: jest.fn() } }));
jest.mock("../memory/api-client", () => ({ memoryApi: { recent: jest.fn(), frequent: jest.fn() } }));
jest.mock("../notifications/api-client", () => ({ pushNotificationApi: { listPendingSubstitutions: jest.fn() } }));
jest.mock("../trips/api-client", () => ({ tripApi: { active: jest.fn() } }));

const mockedLists = jest.mocked(listApi.lists);
const mockedRecent = jest.mocked(memoryApi.recent);
const mockedFrequent = jest.mocked(memoryApi.frequent);
const mockedSubstitutions = jest.mocked(pushNotificationApi.listPendingSubstitutions);
const mockedActive = jest.mocked(tripApi.active);

function renderHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(<QueryClientProvider client={queryClient}><AppShellProvider><AppTopBar initials="Jane" onNotifications={() => mockPush("/substitutions")} onProfile={() => mockPush("/profile")} /><HomeScreen /></AppShellProvider></QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHousehold = { id: "h1", name: "Kamau Home", role: "owner", member_count: 2, created_at: "2026-09-01T00:00:00Z" };
  mockedLists.mockResolvedValue([]);
  mockedRecent.mockResolvedValue({ items: [] });
  mockedFrequent.mockResolvedValue({ items: [] });
  mockedSubstitutions.mockResolvedValue([]);
  mockedActive.mockResolvedValue(null);
});

describe("Home", () => {
  it("renders an intentional new-household state", async () => {
    renderHome();
    expect(screen.getByText("AppShop")).toBeTruthy();
    expect(screen.queryByText(/Good (morning|afternoon|evening)/)).toBeNull();
    expect(await screen.findByText("No shopping lists yet")).toBeTruthy();
    expect(screen.getByText("Ready for the next shop?")).toBeTruthy();
    expect(screen.getByText(/No purchases yet/)).toBeTruthy();
    expect(screen.getByText("Add product")).toBeTruthy();
  });

  it("routes top-bar actions and keeps household content ahead of utilities", async () => {
    const view = renderHome();
    expect(await screen.findByText("No shopping lists yet")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open profile"));
    fireEvent.press(screen.getByLabelText("Open notifications"));
    expect(mockPush).toHaveBeenCalledWith("/profile");
    expect(mockPush).toHaveBeenCalledWith("/substitutions");

    const rendered = JSON.stringify(view.toJSON());
    expect(rendered.indexOf("Shopping Lists")).toBeLessThan(rendered.indexOf("Buy Again"));
    expect(rendered.indexOf("Buy Again")).toBeLessThan(rendered.indexOf("Frequently bought"));
    expect(rendered.indexOf("Frequently bought")).toBeLessThan(rendered.indexOf("Quick actions"));
  });

  it("hides the owner-only Invite member action for household members", async () => {
    mockHousehold = { ...mockHousehold, role: "member" };
    renderHome();
    expect(await screen.findByText("No shopping lists yet")).toBeTruthy();
    expect(screen.queryByText("Invite member")).toBeNull();
  });

  it("renders active shopping, list, attention, and memory data", async () => {
    mockedLists.mockResolvedValue([{ id: "l1", name: "Weekend Shopping", status: "active", version: 1, item_count: 10, created_at: "", updated_at: "" }]);
    mockedActive.mockResolvedValue({ id: "t1", household_id: "h1", shopping_list_id: "l1", status: "active", version: 1, started_at: "", progress: { total: 10, pending: 3, collected: 7, skipped: 0 }, items: [] });
    mockedSubstitutions.mockResolvedValue([{ id: "s1", household_id: "h1", shopping_trip_id: "t1", trip_item_id: "i1", requested_by_user_id: "other", proposed_name: "Whole milk", proposed_brand: "Brookside", proposed_variant: null, proposed_size_value: null, proposed_size_unit: null, status: "pending", resolved_by_user_id: null, resolved_at: null }]);
    mockedRecent.mockResolvedValue({ items: [{ household_product_id: "p1", name: "Bread", usual_quantity: 1, last_purchased_at: new Date().toISOString(), purchase_count: 2, archived: false }] });
    mockedFrequent.mockResolvedValue({ items: [{ household_product_id: "p2", name: "Milk", usual_quantity: 1, last_purchased_at: new Date().toISOString(), purchase_count: 8, archived: false }] });
    renderHome();

    expect(await screen.findByText("Shopping in progress")).toBeTruthy();
    expect(screen.getAllByText("Weekend Shopping").length).toBeGreaterThan(0);
    expect(screen.getByText("Replacement approval")).toBeTruthy();
    expect(screen.getByText("Bread")).toBeTruthy();
    expect(screen.getByText("Bought 8 times")).toBeTruthy();
    fireEvent.press(screen.getByText("Continue shopping"));
    expect(mockPush).toHaveBeenCalledWith("/trip/t1");
  });

  it("keeps useful sections visible when one optional query fails", async () => {
    mockedLists.mockResolvedValue([{ id: "l1", name: "Groceries", status: "active", version: 1, item_count: 4, created_at: "", updated_at: "" }]);
    mockedRecent.mockRejectedValue(new Error("offline"));
    renderHome();

    expect((await screen.findAllByText("Groceries")).length).toBe(2);
    expect(await screen.findByText("Couldn't load this section.")).toBeTruthy();
    expect(screen.getByText("Frequently bought")).toBeTruthy();
  });

  it("shows compact previews from list data without extra list decoration requests", async () => {
    mockedLists.mockResolvedValue([
      { id: "l1", name: "Friday Shopping", status: "active", version: 1, item_count: 2, created_at: "", updated_at: "", items: [
        { id: "i1", name: "Whole milk", requested_quantity: 1, position: 0 },
        { id: "i2", name: "Sourdough bread", requested_quantity: 1, position: 1 }
      ] },
      { id: "l2", name: "A very long household essentials list name", status: "active", version: 1, item_count: 1, created_at: "", updated_at: "" },
      { id: "l3", name: "Not shown", status: "active", version: 1, item_count: 1, created_at: "", updated_at: "" }
    ]);
    renderHome();

    expect(await screen.findByText("Whole milk · Sourdough bread")).toBeTruthy();
    expect(screen.getAllByLabelText("Whole milk image", { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Sourdough bread image", { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Shopping list shopping basket artwork", { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Not shown")).toBeNull();
    expect(mockedLists).toHaveBeenCalledTimes(1);
  });

  it("rebinds all content to the selected household", async () => {
    mockedLists.mockImplementation(async (id) => id === "h1" ? [{ id: "l1", name: "Old household list", status: "active", version: 1, item_count: 1, created_at: "", updated_at: "" }] : [{ id: "l2", name: "New household list", status: "active", version: 1, item_count: 1, created_at: "", updated_at: "" }]);
    const view = renderHome();
    expect((await screen.findAllByText("Old household list")).length).toBe(2);
    mockHousehold = { ...mockHousehold, id: "h2", name: "Second Home" };
    view.rerender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}><AppShellProvider><AppTopBar initials="Jane" onNotifications={() => mockPush("/substitutions")} onProfile={() => mockPush("/profile")} /><HomeScreen /></AppShellProvider></QueryClientProvider>);
    expect((await screen.findAllByText("New household list")).length).toBe(2);
    await waitFor(() => expect(screen.queryByText("Old household list")).toBeNull());
    expect(screen.getByLabelText("Switch household. Current household Second Home")).toBeTruthy();
  });
});
