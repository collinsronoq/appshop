import { Redirect, Slot, useLocalSearchParams } from "expo-router";

import { useAuth } from "../../src/auth/auth-context";
import { LoadingScreen } from "../../src/components/loading-screen";

export default function AuthLayout() {
  const { status } = useAuth();
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  if (status === "loading") {
    return <LoadingScreen />;
  }
  if (status === "authenticated") {
    return <Redirect href={invite ? { pathname: "/invitation/[token]", params: { token: invite } } : "/(app)/(tabs)"} />;
  }
  return <Slot />;
}
