import { Stack, usePathname, useRouter } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../src/auth/auth-context";
import { AppShellProvider, AppTopBar } from "../src/design/components";
import { colors } from "../src/design/theme";
import { HouseholdProvider } from "../src/households/household-context";
import { NotificationCoordinatorHost } from "../src/notifications/notification-coordinator-host";

const queryClient = new QueryClient();

const ROOT_PATHS = new Set(["/", "/lists", "/products", "/history", "/profile"]);

function nestedTitle(pathname: string) {
  if (pathname.startsWith("/lists/new")) return "New shopping list";
  if (pathname.match(/^\/lists\/[^/]+\/add/)) return "Add item";
  if (pathname.match(/^\/lists\/[^/]+\/start/)) return "Start shopping";
  if (pathname.match(/^\/lists\/[^/]+/)) return "List detail";
  if (pathname === "/products/new") return "Add product";
  if (pathname === "/products/edit") return "Edit product";
  if (pathname.match(/^\/products\/[^/]+\/history/)) return "Product history";
  if (pathname.match(/^\/products\/[^/]+/)) return "Product detail";
  if (pathname === "/purchases") return "Purchase History";
  if (pathname === "/purchasing-memory") return "Purchasing Memory";
  if (pathname === "/members") return "Members";
  if (pathname === "/invite") return "Invite member";
  if (pathname === "/households") return "Switch household";
  if (pathname === "/household-settings") return "Rename household";
  if (pathname === "/notifications") return "Notifications";
  if (pathname === "/substitutions") return "Pending approvals";
  if (pathname.startsWith("/substitutions/")) return "Replacement request";
  if (pathname.match(/^\/trip\/[^/]+\/items\/[^/]+\/unavailable/)) return "Unavailable item";
  if (pathname.match(/^\/trip\/[^/]+/)) return "Shopping mode";
  return "AppShop";
}

function AuthenticatedStack() {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = pathname === "/login" || pathname === "/register" || pathname.startsWith("/invitation/");
  const isRoot = ROOT_PATHS.has(pathname) || pathname.includes("/(tabs)");
  const showShell = status === "authenticated" && !isPublicRoute;
  const initials = user?.display_name || user?.email || "U";

  if (!showShell) return <Stack screenOptions={{ headerShown: false }} />;
  return (
    <AppShellProvider>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.shell}>
        <AppTopBar
          initials={initials}
          onBack={() => router.back()}
          onNotifications={() => router.push("/substitutions")}
          onProfile={() => router.push("/profile")}
          title={nestedTitle(pathname)}
          variant={isRoot ? "root" : "nested"}
        />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaView>
    </AppShellProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HouseholdProvider>
          <NotificationCoordinatorHost />
          <AuthenticatedStack />
          <StatusBar style="auto" />
        </HouseholdProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({ shell: { flex: 1, backgroundColor: colors.background } });
