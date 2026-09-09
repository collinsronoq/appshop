import { authApiClient } from "../auth/api-client";
import { householdApiClient } from "./api-client";

jest.mock("../auth/api-client", () => ({
  authApiClient: { authenticatedRequest: jest.fn(async () => ({})) }
}));

describe("household API client", () => {
  it("sends invitations using the backend email field", async () => {
    await householdApiClient.invite("household-a", "person@example.com");

    expect(authApiClient.authenticatedRequest).toHaveBeenCalledWith(
      "/households/household-a/invitations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "person@example.com" })
      })
    );
  });
});
