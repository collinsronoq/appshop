import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { listApi } from "../lists/api-client";
import { pushNotificationApi } from "../notifications/api-client";
import type { SubstitutionRequest } from "../notifications/types";
import { productApi } from "../products/api-client";
import { tripApi } from "../trips/api-client";
import { SubstitutionDetailScreen } from "./substitution-detail-screen";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return { ...actual, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 18, left: 0 }) };
});
jest.mock("../auth/auth-context", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
jest.mock("../households/household-context", () => ({ useHouseholds: () => ({ selected: { id: "h1" } }) }));
jest.mock("../trips/api-client", () => ({ tripApi: { get: jest.fn() } }));
jest.mock("../lists/api-client", () => ({ listApi: { get: jest.fn() } }));
jest.mock("../products/api-client", () => ({ productApi: { get: jest.fn() } }));
jest.mock("../products/product-images", () => {
  const { Text } = jest.requireActual("react-native");
  return { ProductArtwork: ({ name }: { name: string }) => <Text>{name} image</Text> };
});
jest.mock("../notifications/api-client", () => ({ pushNotificationApi: { getSubstitution: jest.fn(), decide: jest.fn() } }));

const baseRequest: SubstitutionRequest = { id: "sub1", household_id: "h1", shopping_trip_id: "t1", trip_item_id: "i1", requested_by_user_id: "other", proposed_product_id: "p2", proposed_name: "Jameson", proposed_brand: "Jameson", proposed_variant: null, proposed_size_value: 750, proposed_size_unit: "ml", status: "pending", resolved_by_user_id: null, resolved_at: null };

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><SubstitutionDetailScreen id="sub1" /></QueryClientProvider>);
}

describe("SubstitutionDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(pushNotificationApi.getSubstitution).mockResolvedValue(baseRequest);
    jest.mocked(tripApi.get).mockResolvedValue({ id: "t1", household_id: "h1", shopping_list_id: "l1", status: "active", version: 1, started_at: "", progress: { total: 1, pending: 1, collected: 0, skipped: 0 }, items: [{ id: "i1", shopping_list_item_id: "s1", status: "pending", name: "Original whiskey", brand: "Original", size_value: 750, size_unit: "ml", requested_quantity: 1, notes: "For the weekend" }] });
    jest.mocked(listApi.get).mockResolvedValue({ id: "l1", name: "Friday", status: "active", version: 1, item_count: 1, created_at: "", updated_at: "", items: [{ id: "s1", household_product_id: "p1", name: "Original whiskey", requested_quantity: 1, notes: "For the weekend", position: 0 }] });
    jest.mocked(productApi.get).mockImplementation(async (_household, id) => ({ id, household_id: "h1", name: id === "p2" ? "Jameson" : "Original whiskey", image_url: `/images/${id}.jpg`, usual_quantity: 1 }));
    jest.mocked(pushNotificationApi.decide).mockImplementation(async (_household, _id, action) => ({ ...baseRequest, status: action === "approve" ? "approved" : "rejected", resolved_by_user_id: "me", resolved_at: "2026-09-23T09:00:00Z" }));
  });

  it("renders the real comparison and applies approval without implying collection", async () => {
    renderScreen();
    expect(await screen.findByText("Original whiskey")).toBeTruthy();
    expect(screen.getByText("Jameson")).toBeTruthy();
    expect(screen.getAllByText("Qty 1")).toHaveLength(2);
    expect(screen.getByText("For the weekend", { exact: false })).toBeTruthy();
    fireEvent.press(screen.getByText("Approve replacement"));
    await waitFor(() => expect(pushNotificationApi.decide).toHaveBeenCalledWith("h1", "sub1", "approve"));
    expect(await screen.findByText("Replacement approved")).toBeTruthy();
    expect(screen.getByText("It still needs to be marked collected", { exact: false })).toBeTruthy();
  });

  it("prevents requester self-approval while keeping explicit rejection available", async () => {
    jest.mocked(pushNotificationApi.getSubstitution).mockResolvedValue({ ...baseRequest, requested_by_user_id: "me" });
    renderScreen();
    expect(await screen.findByText("Waiting for another household member")).toBeTruthy();
    expect(screen.queryByText("Approve replacement")).toBeNull();
    fireEvent.press(screen.getByText("Reject replacement"));
    await waitFor(() => expect(pushNotificationApi.decide).toHaveBeenCalledWith("h1", "sub1", "reject"));
    expect(await screen.findByText("Replacement rejected")).toBeTruthy();
    expect(screen.getByText("remains pending", { exact: false })).toBeTruthy();
  });
});
