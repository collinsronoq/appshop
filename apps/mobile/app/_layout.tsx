import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "../src/auth/auth-context";
import { HouseholdProvider } from "../src/households/household-context";
import { NotificationCoordinator } from "../src/notifications/notification-coordinator";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HouseholdProvider>
          <NotificationCoordinator />
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="auto" />
        </HouseholdProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
