import * as SecureStore from "expo-secure-store";

import { AuthApiClient } from "./api-client";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY"
}));

const mockedSecureStore = jest.mocked(SecureStore);
const fetchMock = jest.fn();

const USER = {
  id: "1f9d3b3e-358a-4acb-97da-fd925ab98db1",
  email: "jane@example.com",
  display_name: "Jane",
  status: "active" as const,
  created_at: "2026-09-08T12:00:00Z"
};

function response(status: number, body?: object): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body ?? {})
  } as unknown as Response;
}

describe("AuthApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = fetchMock;
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);
  });

  it("stores only the refresh credential after login", async () => {
    fetchMock.mockResolvedValueOnce(
      response(200, {
        user: USER,
        access_token: "access-token",
        refresh_token: "refresh-token",
        token_type: "bearer",
        expires_in: 900
      })
    );
    const client = new AuthApiClient("http://api.test/api/v1");

    await client.login({ email: USER.email, password: "valid-password" });

    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      "household-shopping.refresh-token",
      "refresh-token",
      expect.any(Object)
    );
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalledWith(
      expect.anything(),
      "access-token",
      expect.anything()
    );
  });

  it("rotates a stored refresh credential and restores the user", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue("stored-refresh");
    fetchMock
      .mockResolvedValueOnce(
        response(200, {
          access_token: "new-access",
          refresh_token: "new-refresh",
          token_type: "bearer",
          expires_in: 900
        })
      )
      .mockResolvedValueOnce(response(200, USER));
    const client = new AuthApiClient("http://api.test/api/v1");

    await expect(client.restore()).resolves.toEqual(USER);
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      "household-shopping.refresh-token",
      "new-refresh",
      expect.any(Object)
    );
    expect(fetchMock.mock.calls[1]?.[1]?.headers.get("Authorization")).toBe(
      "Bearer new-access"
    );
  });

  it("clears an invalid stored refresh credential", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue("invalid-refresh");
    fetchMock.mockResolvedValueOnce(
      response(401, {
        error: { code: "AUTH_REFRESH_INVALID", message: "Invalid refresh credential." }
      })
    );
    const client = new AuthApiClient("http://api.test/api/v1");

    await expect(client.restore()).resolves.toBeNull();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "household-shopping.refresh-token"
    );
  });

  it("coordinates one refresh and retries concurrent unauthorized requests once", async () => {
    fetchMock.mockResolvedValueOnce(
      response(200, {
        user: USER,
        access_token: "expired-access",
        refresh_token: "refresh-token",
        token_type: "bearer",
        expires_in: 900
      })
    );
    const client = new AuthApiClient("http://api.test/api/v1");
    await client.login({ email: USER.email, password: "valid-password" });

    let resolveRefresh: ((value: Response) => void) | undefined;
    fetchMock
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(401))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveRefresh = resolve;
          })
      )
      .mockResolvedValueOnce(response(200, { value: 1 }))
      .mockResolvedValueOnce(response(200, { value: 2 }));

    const first = client.authenticatedRequest<{ value: number }>("/one");
    const second = client.authenticatedRequest<{ value: number }>("/two");
    await Promise.resolve();
    resolveRefresh?.(
      response(200, {
        access_token: "new-access",
        refresh_token: "new-refresh",
        token_type: "bearer",
        expires_in: 900
      })
    );

    await expect(Promise.all([first, second])).resolves.toEqual([{ value: 1 }, { value: 2 }]);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith("/auth/refresh")
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("clears local credentials even when remote logout fails", async () => {
    fetchMock.mockResolvedValueOnce(
      response(200, {
        user: USER,
        access_token: "access-token",
        refresh_token: "refresh-token",
        token_type: "bearer",
        expires_in: 900
      })
    );
    const client = new AuthApiClient("http://api.test/api/v1");
    await client.login({ email: USER.email, password: "valid-password" });
    fetchMock.mockRejectedValueOnce(new Error("network unavailable"));

    await expect(client.logout()).resolves.toBeUndefined();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "household-shopping.refresh-token"
    );
  });

  it("reports the configured API URL when the network request cannot start", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    const client = new AuthApiClient("http://192.168.160.251:8000/api/v1");

    await expect(
      client.login({ email: USER.email, password: "valid-password" })
    ).rejects.toMatchObject({
      code: "API_UNREACHABLE",
      status: 0,
      message: expect.stringContaining("http://192.168.160.251:8000/api/v1")
    });
  });

  it("lets fetch set the multipart boundary for authenticated form data", async () => {
    fetchMock.mockResolvedValueOnce(response(200, {
      user: USER,
      access_token: "access-token",
      refresh_token: "refresh-token",
      token_type: "bearer",
      expires_in: 900
    }));
    const client = new AuthApiClient("http://api.test/api/v1");
    await client.login({ email: USER.email, password: "valid-password" });
    fetchMock.mockResolvedValueOnce(response(200, { ok: true }));
    const body = new FormData();
    body.append("file", "image-data");

    await client.authenticatedRequest("/upload", { method: "POST", body });

    const headers = fetchMock.mock.calls[1]?.[1]?.headers as Headers;
    expect(headers.get("Content-Type")).toBeNull();
    expect(headers.get("Authorization")).toBe("Bearer access-token");
  });
});
