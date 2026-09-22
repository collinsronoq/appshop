import { Stack, usePathname, useRouter } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../src/auth/auth-context";
import { AppShellProvider, AppTopBar } from "../src/design/components";
import { colors } from "../src/design/theme";
import { HouseholdProvider } from "../src/households/household-context";
import { NotificationCoordinatorHost } from "../src/notifications/notification-coordinator-host";
import { LoadingScreen } from "../src/components/loading-screen";

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
  if (pathname === "/purchasing-memory") return "Buy Again";
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
  const productMatch = pathname.match(/^\/products\/([^/]+)$/);
  const productId = productMatch?.[1];

  if (!showShell) return <Stack screenOptions={{ headerShown: false }} />;
  return (
    <AppShellProvider>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.shell}>
        <AppTopBar
          initials={initials}
          onBack={() => router.back()}
          onNotifications={() => router.push("/substitutions")}
          onProfile={() => router.push("/profile")}
          right={productId && productId !== "new" ? (
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/products/edit", params: { id: decodeURIComponent(productId) } })} style={styles.editAction}>
              <Feather color={colors.primary} name="edit-2" size={16} />
              <Text style={styles.editActionText}>Edit</Text>
            </Pressable>
          ) : undefined}
          title={nestedTitle(pathname)}
          variant={isRoot ? "root" : "nested"}
        />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaView>
    </AppShellProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    AppShopSans: require("../assets/fonts/DejaVuSans.ttf"),
    AppShopSansBold: require("../assets/fonts/DejaVuSans-Bold.ttf"),
    AppShopSerifBold: require("../assets/fonts/DejaVuSerif-Bold.ttf")
  });

  if (!fontsLoaded) return <LoadingScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HouseholdProvider>
          <NotificationCoordinatorHost />
          <AuthenticatedStack />
          <StatusBar style="dark" />
        </HouseholdProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background },
  editAction: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8 },
  editActionText: { fontFamily: "AppShopSansBold", fontSize: 14, color: colors.primary }
});
