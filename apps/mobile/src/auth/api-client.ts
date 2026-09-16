import { refreshTokenStorage, type RefreshTokenStorage } from "./storage";
import type {
  ApiErrorPayload,
  AuthResponse,
  LoginInput,
  RegisterInput,
  TokenResponse,
  User
} from "./types";
import { pushStorage } from "../notifications/storage";
import { API_BASE_URL } from "../config/runtime";

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

export interface AuthClient {
  restore(): Promise<User | null>;
  login(input: LoginInput): Promise<User>;
  register(input: RegisterInput): Promise<User>;
  logout(): Promise<void>;
  authenticatedRequest<T>(path: string, init?: RequestInit): Promise<T>;
  getAccessToken?(): string | null;
}

export class AuthApiClient implements AuthClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<void> | null = null;
  private readonly baseUrl: string;

  constructor(
    baseUrl = API_BASE_URL,
    private readonly storage: RefreshTokenStorage = refreshTokenStorage
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async restore(): Promise<User | null> {
    const storedToken = await this.storage.get();
    if (!storedToken) {
      return null;
    }
    this.refreshToken = storedToken;
    try {
      await this.refreshAccessToken();
      return await this.authenticatedRequest<User>("/me");
    } catch {
      await this.clearLocalSession();
      return null;
    }
  }

  async login(input: LoginInput): Promise<User> {
    const response = await this.publicRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input)
    });
    await this.acceptCredentials(response);
    return response.user;
  }

  async register(input: RegisterInput): Promise<User> {
    const response = await this.publicRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input)
    });
    await this.acceptCredentials(response);
    return response.user;
  }

  async logout(): Promise<void> {
    try {
      const pushTokenId = await pushStorage.getTokenId();
      if (pushTokenId && this.accessToken) {
        try {
          await this.authenticatedRequest<void>(`/push-tokens/${pushTokenId}`, {
            method: "DELETE"
          });
        } catch {
          // Push cleanup is best-effort and must never block local logout.
        }
      }
      const token = this.refreshToken ?? (await this.storage.get());
      if (token) {
        await this.publicRequest<void>("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: token })
        });
      }
    } catch {
      // Local sign-out must succeed even when the API is unreachable.
    } finally {
      await pushStorage.clearTokenId();
      await this.clearLocalSession();
    }
  }

  async authenticatedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.requestWithAccessToken<T>(path, init, true);
  }

  getAccessToken(): string | null { return this.accessToken; }

  private async requestWithAccessToken<T>(
    path: string,
    init: RequestInit,
    mayRetry: boolean
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: this.headers(init.headers, this.accessToken, init.body)
      });
    } catch {
      throw new AuthApiError(
        `Unable to reach the API at ${this.baseUrl}. Check that your phone and computer are on the same network.`,
        "API_UNREACHABLE",
        0
      );
    }
    if (response.status === 401 && mayRetry && this.refreshToken) {
      await this.refreshAccessToken();
      return this.requestWithAccessToken<T>(path, init, false);
    }
    return this.parseResponse<T>(response);
  }

  private async publicRequest<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: this.headers(init.headers, null, init.body)
      });
    } catch {
      throw new AuthApiError(
        `Unable to reach the API at ${this.baseUrl}. Check that your phone and computer are on the same network.`,
        "API_UNREACHABLE",
        0
      );
    }
    return this.parseResponse<T>(response);
  }

  private refreshAccessToken(): Promise<void> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async performRefresh(): Promise<void> {
    if (!this.refreshToken) {
      throw new AuthApiError("Authentication is required.", "AUTH_UNAUTHENTICATED", 401);
    }
    try {
      const response = await this.publicRequest<TokenResponse>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: this.refreshToken })
      });
      await this.acceptCredentials(response);
    } catch (error) {
      await this.clearLocalSession();
      throw error;
    }
  }

  private async acceptCredentials(response: TokenResponse): Promise<void> {
    await this.storage.set(response.refresh_token);
    this.refreshToken = response.refresh_token;
    this.accessToken = response.access_token;
  }

  private async clearLocalSession(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    await this.storage.remove();
  }

  private headers(existing: HeadersInit | undefined, accessToken: string | null, body?: BodyInit | null): Headers {
    const headers = new Headers(existing);
    headers.set("Accept", "application/json");
    const multipart = typeof FormData !== "undefined" && body instanceof FormData;
    if (!multipart) headers.set("Content-Type", "application/json");
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return headers;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload & T;
    if (!response.ok) {
      throw new AuthApiError(
        payload.error?.message ?? "Something went wrong. Please try again.",
        payload.error?.code ?? "API_ERROR",
        response.status
      );
    }
    return payload;
  }
}

export const authApiClient = new AuthApiClient();
