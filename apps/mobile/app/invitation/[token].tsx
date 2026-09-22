import Feather from "@expo/vector-icons/Feather";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../src/auth/auth-context";
import { AppScreen, BrandMark, InlineError, LoadingState, PrimaryButton, SurfaceCard } from "../../src/design/components";
import { colors, iconSizes, radius, spacing, typography } from "../../src/design/theme";
import { householdApiClient } from "../../src/households/api-client";

export default function InvitationRoute() {
  const { status } = useAuth();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !token) return;
    void householdApiClient.accept(token).then(
      () => router.replace("/(app)/(tabs)"),
      () => setError("This invitation is invalid, expired, or has already been used.")
    );
  }, [status, token, router]);

  if (status === "unauthenticated") return <Redirect href={{ pathname: "/login", params: { invite: token } }} />;

  return (
    <AppScreen contentStyle={styles.content}>
      <View style={styles.brand}><BrandMark size={42} /><Text style={styles.wordmark}>AppShop</Text></View>
      {status === "loading" || !error ? (
        <SurfaceCard style={styles.card}>
          <View style={styles.icon}><Feather color={colors.primary} name="users" size={iconSizes.lg} /></View>
          <Text style={styles.title}>Joining household…</Text>
          <Text style={styles.body}>We’re checking your invitation and connecting you to the shared space.</Text>
          <LoadingState rows={1} />
        </SurfaceCard>
      ) : (
        <SurfaceCard style={styles.card}>
          <InlineError message={error} />
          <PrimaryButton label="Go to AppShop" onPress={() => router.replace("/(app)/(tabs)")} />
        </SurfaceCard>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: "center", paddingVertical: spacing.xxxl },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xxl },
  wordmark: { ...typography.sectionTitle, color: colors.primary },
  card: { gap: spacing.md },
  icon: { width: 56, height: 56, borderRadius: radius.round, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySubtle },
  title: { ...typography.screenTitle, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary }
});
