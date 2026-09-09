import { authApiClient } from "../auth/api-client";
import { memoryApi } from "./api-client";

jest.mock("../auth/api-client", () => ({
  authApiClient: { authenticatedRequest: jest.fn(async (path: string) => ({ path })) }
}));

describe("purchasing memory API", () => {
  it("keeps recent and frequent queries household-scoped", async () => {
    await memoryApi.recent("household-a");
    await memoryApi.frequent("household-b");

    expect(authApiClient.authenticatedRequest).toHaveBeenNthCalledWith(
      1,
      "/households/household-a/purchasing-memory/recent"
    );
    expect(authApiClient.authenticatedRequest).toHaveBeenNthCalledWith(
      2,
      "/households/household-b/purchasing-memory/frequent"
    );
  });
});
