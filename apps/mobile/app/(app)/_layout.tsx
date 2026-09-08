import { Redirect, Slot } from "expo-router";

import { useAuth } from "../../src/auth/auth-context";
import { LoadingScreen } from "../../src/components/loading-screen";

export default function AppLayout() {
  const { status } = useAuth();
  if (status === "loading") {
    return <LoadingScreen />;
  }
  if (status === "unauthenticated") {
    return <Redirect href="/login" />;
  }
  return <Slot />;
}
