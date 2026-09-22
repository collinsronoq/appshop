import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useHouseholds } from "../households/household-context";
import { AppScreen, BrandMark, InlineError, PrimaryButton, SurfaceCard } from "../design/components";
import { colors, iconSizes, radius, spacing, typography } from "../design/theme";

export function CreateHouseholdScreen() {
  const { createHousehold } = useHouseholds();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!name.trim()) { setError("Enter a household name."); return; }
    setBusy(true); setError(null);
    try { await createHousehold(name.trim()); }
    catch { setError("Unable to create household. Try again."); }
    finally { setBusy(false); }
  };
  return (
    <AppScreen contentStyle={styles.content} keyboardSafe>
      <View style={styles.brand}><BrandMark size={46} /><Text style={styles.wordmark}>AppShop</Text></View>
      <View style={styles.illustration}><Feather color={colors.primary} name="home" size={iconSizes.lg + 10} /><View style={styles.people}><Feather color={colors.peach} name="users" size={iconSizes.md} /></View></View>
      <Text accessibilityRole="header" style={styles.title}>Create your household</Text>
      <Text style={styles.body}>Start a private shared space for shopping and planning together.</Text>
      <SurfaceCard style={styles.form}>
        <Text style={styles.label}>Household name</Text>
        <TextInput accessibilityLabel="Household name" autoCapitalize="words" autoComplete="organization" onChangeText={(value) => { setName(value); if (error) setError(null); }} onSubmitEditing={() => void submit()} placeholder="e.g. The Kamau home" returnKeyType="done" style={styles.input} value={name} />
        {error ? <InlineError message={error} /> : null}
        <PrimaryButton disabled={!name.trim()} label="Create household" loading={busy} onPress={() => void submit()} />
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: "center", paddingVertical: spacing.xxxl },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xxxl },
  wordmark: { ...typography.sectionTitle, color: colors.primary },
  illustration: { width: 88, height: 88, borderRadius: radius.xl, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySubtle, marginBottom: spacing.xxl },
  people: { position: "absolute", right: -6, bottom: -4, width: 38, height: 38, borderRadius: radius.round, alignItems: "center", justifyContent: "center", backgroundColor: colors.peachSurface, borderWidth: 3, borderColor: colors.background },
  title: { ...typography.display, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xxl },
  form: { gap: spacing.sm },
  label: { ...typography.bodyStrong, color: colors.text },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, ...typography.body, color: colors.text }
});
