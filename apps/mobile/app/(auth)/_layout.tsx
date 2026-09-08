import { Redirect, Slot } from "expo-router";

import { useAuth } from "../../src/auth/auth-context";
import { LoadingScreen } from "../../src/components/loading-screen";

export default function AuthLayout() {
  const { status } = useAuth();
  if (status === "loading") {
    return <LoadingScreen />;
  }
  if (status === "authenticated") {
    return <Redirect href="/(app)" />;
  }
  return <Slot />;
}
