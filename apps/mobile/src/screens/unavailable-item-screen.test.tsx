import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { UnavailableItemScreen } from "./unavailable-item-screen";
import { listApi } from "../lists/api-client";
import { pushNotificationApi } from "../notifications/api-client";
import { productApi } from "../products/api-client";
import { tripApi } from "../trips/api-client";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ tripId: "trip-1", tripItemId: "trip-item-1" }),
  useRouter: () => ({ back: mockBack })
}));
jest.mock("../households/household-context", () => ({ useHouseholds: () => ({ selected: { id: "household-1" } }) }));
jest.mock("../trips/api-client", () => ({ tripApi: { get: jest.fn() } }));
jest.mock("../lists/api-client", () => ({ listApi: { get: jest.fn() } }));
jest.mock("../products/api-client", () => ({ productApi: { get: jest.fn(), listFiltered: jest.fn() } }));
jest.mock("../notifications/api-client", () => ({ pushNotificationApi: { applyPreferred: jest.fn(), createRequest: jest.fn() } }));

const mockedTrip = jest.mocked(tripApi.get);
const mockedList = jest.mocked(listApi.get);
const mockedProduct = jest.mocked(productApi.get);
const mockedProducts = jest.mocked(productApi.listFiltered);
const mockedCreateRequest = jest.mocked(pushNotificationApi.createRequest);

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><UnavailableItemScreen /></QueryClientProvider>);
}

describe("UnavailableItemScreen catalogue replacement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedTrip.mockResolvedValue({ id: "trip-1", household_id: "household-1", shopping_list_id: "list-1", status: "active", version: 1, started_at: "", progress: { total: 1, pending: 1, collected: 0, skipped: 0 }, items: [{ id: "trip-item-1", shopping_list_item_id: "list-item-1", status: "pending", name: "Unavailable whiskey", requested_quantity: 1 }] });
    mockedList.mockResolvedValue({ id: "list-1", name: "Shopping", status: "active", version: 1, item_count: 1, created_at: "", updated_at: "", items: [{ id: "list-item-1", household_product_id: "source-product", name: "Unavailable whiskey", requested_quantity: 1, position: 0 }] });
    mockedProduct.mockResolvedValue({ id: "source-product", household_id: "household-1", name: "Unavailable whiskey", usual_quantity: 1, preferred_substitutes: [] });
    mockedProducts.mockResolvedValue([{ id: "replacement-1", household_id: "household-1", name: "Jameson", brand: "Jameson", size_value: "750.000" as unknown as number, size_unit: "ml", usual_quantity: 1 }]);
    mockedCreateRequest.mockResolvedValue({ id: "sub-1" } as never);
  });

  it("keeps catalogue choices out of review until selected, then submits the selected product", async () => {
    const invalidate = jest.spyOn(QueryClient.prototype, "invalidateQueries");
    renderScreen();
    fireEvent.press(await screen.findByText("Choose from catalogue"));

    expect(await screen.findByText("Jameson · 750 ml")).toBeTruthy();
    expect(screen.queryByText("Proposed")).toBeNull();
    expect(screen.queryByText("Ask household")).toBeNull();

    fireEvent.press(screen.getByText("Jameson · 750 ml"));
    expect(await screen.findByText("Proposed")).toBeTruthy();
    expect(screen.getByText("Jameson")).toBeTruthy();
    expect(screen.getByText("Jameson · 750 ml")).toBeTruthy();

    fireEvent.press(screen.getByText("Ask household"));
    await waitFor(() => expect(mockedCreateRequest).toHaveBeenCalledWith("household-1", "trip-1", "trip-item-1", { proposed_product_id: "replacement-1" }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["households", "household-1", "substitutions", "pending"] });
  });
});
