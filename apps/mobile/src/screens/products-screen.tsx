import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader, AppScreen, InlineError, LoadingState, PrimaryButton, SurfaceCard } from "../design/components";
import { colors, radius, spacing, typography } from "../design/theme";
import { useHouseholds } from "../households/household-context";
import { productApi } from "../products/api-client";

export function ProductsScreen() {
  const router = useRouter();
  const { selected } = useHouseholds();
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["households", selected?.id, "products", search], queryFn: () => productApi.list(selected!.id, search ? `?query=${encodeURIComponent(search)}` : ""), enabled: Boolean(selected) });
  return (
    <AppScreen keyboardSafe>
      <AppHeader title="Products" subtitle="Your household catalogue." />
      <TextInput accessibilityLabel="Search products" placeholder="Search products" placeholderTextColor={colors.textSecondary} value={search} onChangeText={setSearch} style={styles.search} />
      {query.isLoading ? <LoadingState rows={3} /> : query.isError ? <InlineError onRetry={() => void query.refetch()} /> : !query.data?.length ? (
        <SurfaceCard><Text style={styles.emptyTitle}>{search ? "No matching products" : "No household products yet"}</Text><Text style={styles.meta}>{search ? "Try a different name, brand, or variant." : "Add the products your household buys regularly."}</Text></SurfaceCard>
      ) : (
        <View style={styles.list}>{query.data.map((product) => (
          <Pressable accessibilityRole="button" key={product.id} onPress={() => router.push(`/products/${product.id}`)}>
            <SurfaceCard><Text style={styles.name}>{product.name}</Text><Text style={styles.meta}>{[product.brand, product.variant, product.size_value && `${product.size_value} ${product.size_unit ?? ""}`, product.category?.display_name].filter(Boolean).join(" · ") || `Usual quantity: ${product.usual_quantity}`}</Text></SurfaceCard>
          </Pressable>
        ))}</View>
      )}
      <View style={styles.action}><PrimaryButton icon="plus" label="Add product" onPress={() => router.push("/products/new")} /></View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  search: { minHeight: 48, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, ...typography.body, color: colors.text, marginBottom: spacing.lg },
  list: { gap: spacing.sm },
  name: { ...typography.cardTitle, color: colors.text },
  meta: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  emptyTitle: { ...typography.cardTitle, color: colors.text },
  action: { marginTop: spacing.xl }
});
