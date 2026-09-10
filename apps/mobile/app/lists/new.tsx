import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, TextInput, StyleSheet, View } from "react-native";

import { BackHeader, AppScreen, PrimaryButton } from "../../src/design/components";
import { colors, radius, spacing, typography } from "../../src/design/theme";
import { useHouseholds } from "../../src/households/household-context";
import { listApi } from "../../src/lists/api-client";

export default function NewListScreen() {
  const router = useRouter();
  const { selected } = useHouseholds();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = async () => {
    if (!selected || !name.trim()) return;
    setSaving(true); setError(null);
    try { const list = await listApi.create(selected.id, name.trim()); router.replace(`/lists/${list.id}`); }
    catch { setError("Unable to create the list. Please try again."); }
    finally { setSaving(false); }
  };
  return (
    <AppScreen keyboardSafe contentStyle={styles.content}>
      <BackHeader onBack={() => router.back()} title="New shopping list" />
      <Text style={styles.label}>List name</Text>
      <TextInput accessibilityLabel="List name" autoFocus onChangeText={setName} placeholder="e.g. Weekend Shopping" placeholderTextColor={colors.textSecondary} returnKeyType="done" value={name} onSubmitEditing={() => void create()} style={styles.input} />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <View style={styles.action}><PrimaryButton label="Create list" loading={saving} disabled={!name.trim()} onPress={() => void create()} /></View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ content: { paddingTop: spacing.sm }, label: { ...typography.bodyStrong, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm }, input: { minHeight: 52, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: spacing.lg, ...typography.body }, error: { ...typography.secondary, color: colors.danger, backgroundColor: colors.dangerSurface, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md }, action: { marginTop: spacing.xl } });
