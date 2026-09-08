import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { authApiClient, type AuthClient } from "./api-client";
import type { AuthStatus, LoginInput, RegisterInput, User } from "./types";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  login(input: LoginInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = PropsWithChildren<{
  client?: AuthClient;
}>;

export function AuthProvider({ children, client = authApiClient }: AuthProviderProps) {
  const clientRef = useRef(client);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;
    void clientRef.current
      .restore()
      .then((restoredUser) => {
        if (!active) {
          return;
        }
        setUser(restoredUser);
        setStatus(restoredUser ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setStatus("unauthenticated");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const authenticatedUser = await clientRef.current.login(input);
    setUser(authenticatedUser);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const authenticatedUser = await clientRef.current.register(input);
    setUser(authenticatedUser);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await clientRef.current.logout();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
