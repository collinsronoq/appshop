import { authApiClient } from "../auth/api-client";
import { tripApi } from "./api-client";

jest.mock("../auth/api-client", () => ({ authApiClient: { authenticatedRequest: jest.fn(async (path: string) => ({ path })) } }));

describe("shopping trip API client", () => {
  beforeEach(() => jest.clearAllMocks());
  it("keeps trip actions household and trip scoped", async () => {
    await tripApi.get("h1", "t1");
    await tripApi.collect("h1", "t1", "i1");
    await tripApi.undo("h1", "t1", "i1");
    expect(authApiClient.authenticatedRequest).toHaveBeenNthCalledWith(1, "/households/h1/trips/t1", undefined);
    expect(authApiClient.authenticatedRequest).toHaveBeenNthCalledWith(2, "/households/h1/trips/t1/items/i1/collect", expect.objectContaining({ method: "POST" }));
    expect(authApiClient.authenticatedRequest).toHaveBeenNthCalledWith(3, "/households/h1/trips/t1/items/i1/undo", expect.objectContaining({ method: "POST" }));
  });

  it("supports completion and cancellation endpoints", async () => {
    await tripApi.complete("h1", "t1");
    await tripApi.cancel("h1", "t1");
    expect(authApiClient.authenticatedRequest).toHaveBeenNthCalledWith(1, "/households/h1/trips/t1/complete", expect.objectContaining({ method: "POST" }));
    expect(authApiClient.authenticatedRequest).toHaveBeenNthCalledWith(2, "/households/h1/trips/t1/cancel", expect.objectContaining({ method: "POST" }));
  });
});
