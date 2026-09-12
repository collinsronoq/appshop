import Feather from "@expo/vector-icons/Feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { AppScreen, BackHeader, PrimaryButton, SurfaceCard } from "../../../src/design/components";
import { colors, iconSizes, radius, spacing, typography } from "../../../src/design/theme";
import { useHouseholds } from "../../../src/households/household-context";
import { tripApi } from "../../../src/trips/api-client";

export default function StartTrip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selected } = useHouseholds();
  const router = useRouter();
  const [store, setStore] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const begin = async () => {
    if (!selected || !id || starting) return;
    setStarting(true);
    setError("");
    try {
      const trip = await tripApi.start(selected.id, id, store.trim() || undefined);
      router.replace(`/trip/${trip.id}`);
    } catch {
      setError("Couldn’t start shopping. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <AppScreen keyboardSafe>
      <BackHeader title="Start shopping" onBack={() => router.back()} />
      <SurfaceCard style={styles.card}>
        <View style={styles.intro}>
          <View style={styles.icon}>
            <Feather color={colors.primary} name="shopping-cart" size={iconSizes.md} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>Ready to shop?</Text>
            <Text style={styles.body}>Optionally add the store, then begin your trip.</Text>
          </View>
        </View>
        <View>
          <Text style={styles.label}>Store</Text>
          <TextInput
            accessibilityLabel="Store name"
            onChangeText={setStore}
            onSubmitEditing={() => void begin()}
            placeholder="Optional store name"
            returnKeyType="done"
            style={styles.input}
            value={store}
          />
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <PrimaryButton icon="arrow-right" label="Begin trip" loading={starting} onPress={() => void begin()} />
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  intro: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.round, backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  title: { ...typography.sectionTitle, color: colors.text },
  body: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  label: { ...typography.bodyStrong, color: colors.text, marginBottom: spacing.sm },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: spacing.md, ...typography.body },
  error: { ...typography.secondary, color: colors.danger, backgroundColor: colors.dangerSurface, borderRadius: radius.md, padding: spacing.md }
});
