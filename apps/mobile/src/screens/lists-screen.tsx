import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader, AppScreen, InlineError, LoadingState, PrimaryButton, SurfaceCard } from "../design/components";
import { colors, radius, spacing, typography } from "../design/theme";
import { useHouseholds } from "../households/household-context";
import { listApi } from "../lists/api-client";

export function ListsScreen() {
  const router = useRouter();
  const { selected } = useHouseholds();
  const [name, setName] = useState("");
  const query = useQuery({ queryKey: ["households", selected?.id, "shopping-lists"], queryFn: () => listApi.lists(selected!.id), enabled: Boolean(selected) });
  const create = async () => {
    if (!selected || !name.trim()) return;
    const list = await listApi.create(selected.id, name.trim());
    setName("");
    await query.refetch();
    router.push(`/lists/${list.id}`);
  };
  return (
    <AppScreen keyboardSafe>
      <AppHeader title="Shopping Lists" subtitle="Plan what your household needs." />
      {query.isLoading ? <LoadingState rows={3} /> : query.isError ? <InlineError onRetry={() => void query.refetch()} /> : !query.data?.length ? (
        <SurfaceCard><Text style={styles.emptyTitle}>No shopping lists yet</Text><Text style={styles.emptyBody}>Create your first list below and start adding what the household needs.</Text></SurfaceCard>
      ) : (
        <View style={styles.list}>{query.data.map((list) => (
          <Pressable accessibilityRole="button" key={list.id} onPress={() => router.push(`/lists/${list.id}`)}>
            <SurfaceCard><Text style={styles.name}>{list.name}</Text><Text style={styles.meta}>{list.item_count} item{list.item_count === 1 ? "" : "s"}</Text></SurfaceCard>
          </Pressable>
        ))}</View>
      )}
      <Text style={styles.label}>New list</Text>
      <TextInput accessibilityLabel="New list name" placeholder="List name" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} style={styles.input} />
      <View style={styles.action}><PrimaryButton label="Create list" onPress={() => void create()} disabled={!name.trim()} /></View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  name: { ...typography.cardTitle, color: colors.text },
  meta: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  emptyTitle: { ...typography.cardTitle, color: colors.text },
  emptyBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  label: { ...typography.bodyStrong, color: colors.text, marginTop: spacing.xxl, marginBottom: spacing.sm },
  input: { minHeight: 48, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: spacing.md, ...typography.body, color: colors.text },
  action: { marginTop: spacing.md }
});
