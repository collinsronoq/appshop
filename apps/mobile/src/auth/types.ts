export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type User = {
  id: string;
  email: string;
  display_name: string;
  status: "active" | "disabled";
  created_at: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  display_name: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
};

export type AuthResponse = TokenResponse & {
  user: User;
};

export type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
};
