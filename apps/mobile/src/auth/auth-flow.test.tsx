import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { AuthApiError, type AuthClient } from "./api-client";
import { AuthProvider, useAuth } from "./auth-context";
import { HouseholdProvider } from "../households/household-context";
import { HouseholdApiClient } from "../households/api-client";
import type { LoginInput, RegisterInput, User } from "./types";
import { HomeScreen as AuthenticatedHomeScreen } from "../home/home-screen";
import { LoginScreen } from "../screens/login-screen";
import { RegisterScreen } from "../screens/register-screen";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({})
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined)
}));

const USER: User = {
  id: "1f9d3b3e-358a-4acb-97da-fd925ab98db1",
  email: "jane@example.com",
  display_name: "Jane",
  status: "active",
  created_at: "2026-09-08T12:00:00Z"
};

class FakeAuthClient implements AuthClient {
  restoredUser: User | null = null;
  loginError: Error | null = null;
  logoutCalls = 0;

  async restore() {
    return this.restoredUser;
  }

  async login(_input: LoginInput) {
    if (this.loginError) {
      throw this.loginError;
    }
    return USER;
  }

  async register(_input: RegisterInput) {
    return USER;
  }

  async logout() {
    this.logoutCalls += 1;
  }

  async authenticatedRequest<T>(path: string, _init?: RequestInit) {
    if (path === "/households") {
      return [{ id: "h1", name: "Home", role: "owner", member_count: 1, created_at: "2026-09-08T12:00:00Z" }] as T;
    }
    if (path.endsWith("/shopping-lists") || path.includes("/substitutions")) {
      return [] as T;
    }
    if (path.includes("/purchasing-memory/")) {
      return { items: [] } as T;
    }
    return USER as T;
  }
}

function LogoutControl() {
  const { logout } = useAuth();
  return <Text onPress={() => void logout()}>Log out</Text>;
}

function SessionSwitch({ authScreen, authenticatedScreen }: { authScreen: ReactNode; authenticatedScreen: ReactNode }) {
  const { status } = useAuth();
  if (status === "loading") {
    return null;
  }
  return status === "authenticated" ? authenticatedScreen : authScreen;
}

function renderFlow(client: AuthClient, authScreen: ReactNode = <LoginScreen />, authenticatedScreen: ReactNode = <AuthenticatedHomeScreen />) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider client={client}>
        <HouseholdProvider client={new HouseholdApiClient(client)}>
          <SessionSwitch authScreen={authScreen} authenticatedScreen={authenticatedScreen} />
        </HouseholdProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("mobile authentication flow", () => {
  it("shows login after an unauthenticated startup", async () => {
    renderFlow(new FakeAuthClient());
    expect(await screen.findByText("Welcome back", {}, { timeout: 5000 })).toBeTruthy();
  });

  it("enters the authenticated shell after login", async () => {
    renderFlow(new FakeAuthClient());
    fireEvent.changeText(await screen.findByLabelText("Email"), "jane@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "correct horse battery staple");
    fireEvent.press(screen.getByText("Sign in"));
    expect(await screen.findByText(/Good (morning|afternoon|evening), Jane/)).toBeTruthy();
    expect(await screen.findByText("Ready for the next shop?")).toBeTruthy();
  });

  it("enters the authenticated shell after registration", async () => {
    renderFlow(new FakeAuthClient(), <RegisterScreen />);
    fireEvent.changeText(await screen.findByLabelText("Display name"), "Jane");
    fireEvent.changeText(screen.getByLabelText("Email"), "jane@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "correct horse battery staple");
    fireEvent.press(screen.getByText("Create account"));
    expect(await screen.findByText(/Good (morning|afternoon|evening), Jane/)).toBeTruthy();
    expect(await screen.findByText("Ready for the next shop?")).toBeTruthy();
  });

  it("displays a generic invalid-login error", async () => {
    const client = new FakeAuthClient();
    client.loginError = new AuthApiError(
      "Invalid email or password.",
      "AUTH_INVALID_CREDENTIALS",
      401
    );
    renderFlow(client);
    fireEvent.changeText(await screen.findByLabelText("Email"), "jane@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "wrong-password");
    fireEvent.press(screen.getByText("Sign in"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
  });

  it("restores a stored session into the authenticated shell", async () => {
    const client = new FakeAuthClient();
    client.restoredUser = USER;
    renderFlow(client);
    expect(await screen.findByText(/Good (morning|afternoon|evening), Jane/)).toBeTruthy();
    expect(await screen.findByText("Ready for the next shop?")).toBeTruthy();
  });

  it("returns to login after logout", async () => {
    const client = new FakeAuthClient();
    client.restoredUser = USER;
    renderFlow(client, <LoginScreen />, <LogoutControl />);
    fireEvent.press(await screen.findByText("Log out"));
    await waitFor(() => expect(client.logoutCalls).toBe(1));
    expect(await screen.findByText("Welcome back")).toBeTruthy();
  });
});
