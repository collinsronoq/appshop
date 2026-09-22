import Feather from "@expo/vector-icons/Feather";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../src/auth/auth-context";
import { LoadingScreen } from "../src/components/loading-screen";
import { BrandMark, GroceryPattern, PrimaryButton, SecondaryButton } from "../src/design/components";
import { colors, spacing, typography } from "../src/design/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const { status } = useAuth();
  if (status === "loading") return <LoadingScreen />;
  if (status === "authenticated") return <Redirect href={invite ? { pathname: "/invitation/[token]", params: { token: invite } } : "/(app)/(tabs)"} />;

  return (
    <SafeAreaView style={styles.screen}>
      <GroceryPattern />
      <View style={styles.content}>
        <View style={styles.brandRow}><BrandMark size={48} /><Text style={styles.wordmark}>AppShop</Text></View>
        <View style={styles.copy}>
          <Text accessibilityRole="header" style={styles.title}>Shopping feels better together.</Text>
          <Text style={styles.subtitle}>Shared lists. Easy replacements. Your favourites, remembered.</Text>
        </View>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.heroWrap}>
          <View style={styles.heroHalo} />
          <Image resizeMode="contain" source={require("../assets/images/welcome-groceries.png")} style={styles.hero} />
          <View style={styles.heroNote}><Feather color={colors.primary} name="heart" size={16} /><Text style={styles.heroNoteText}>Made for households</Text></View>
        </View>
        <View style={styles.actions}>
          <PrimaryButton label="Create account" onPress={() => router.push(invite ? { pathname: "/register", params: { invite } } : "/register")} />
          <SecondaryButton label="Log in" onPress={() => router.push(invite ? { pathname: "/login", params: { invite } } : "/login")} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  content: { flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  wordmark: { ...typography.screenTitle, color: colors.primary },
  copy: { marginTop: spacing.xxl, zIndex: 1 },
  title: { ...typography.display, color: colors.text, maxWidth: 350 },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, maxWidth: 330 },
  heroWrap: { flex: 1, minHeight: 260, alignItems: "center", justifyContent: "center" },
  heroHalo: { position: "absolute", width: 270, height: 270, borderRadius: 160, backgroundColor: colors.primarySubtle },
  hero: { width: "100%", height: "100%", maxHeight: 390 },
  heroNote: { position: "absolute", right: 0, bottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.xs, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  heroNoteText: { ...typography.caption, color: colors.primary },
  actions: { gap: spacing.sm }
});
