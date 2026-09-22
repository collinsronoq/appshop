import Feather from "@expo/vector-icons/Feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AuthApiError } from "../../src/auth/api-client";
import { AppScreen, InlineError, LoadingState, ModalSheet, PrimaryButton, SecondaryButton, SurfaceCard, TertiaryButton } from "../../src/design/components";
import { formatQuantity, formatSize } from "../../src/design/format";
import { colors, radius, spacing, typography } from "../../src/design/theme";
import { useHouseholds } from "../../src/households/household-context";
import { listApi } from "../../src/lists/api-client";
import { productApi } from "../../src/products/api-client";
import { ProductArtwork } from "../../src/products/product-images";
import { purchasesApi } from "../../src/purchases/api-client";

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selected } = useHouseholds();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [addingListId, setAddingListId] = useState<string>();
  const [substituteOpen, setSubstituteOpen] = useState(false);
  const [savingSubstituteId, setSavingSubstituteId] = useState<string>();

  const productQuery = useQuery({ queryKey: ["households", selected?.id, "products", id], queryFn: () => productApi.get(selected!.id, id), enabled: Boolean(selected && id) });
  const summary = useQuery({ queryKey: ["households", selected?.id, "products", id, "summary"], queryFn: () => purchasesApi.summary(selected!.id, id), enabled: Boolean(selected && id) });
  const lists = useQuery({ queryKey: ["households", selected?.id, "shopping-lists"], queryFn: () => listApi.lists(selected!.id), enabled: Boolean(selected) });
  const substituteOptions = useQuery({ queryKey: ["households", selected?.id, "products", "substitute-options"], queryFn: () => productApi.list(selected!.id), enabled: Boolean(selected && substituteOpen) });

  if (productQuery.isLoading) return <AppScreen><LoadingState rows={5} /></AppScreen>;
  if (productQuery.isError || !productQuery.data) return <AppScreen><InlineError onRetry={() => void productQuery.refetch()} /></AppScreen>;

  const product = productQuery.data;
  const add = () => lists.data?.length ? setAddOpen(true) : router.push("/lists/new");
  const addToList = async (list: { id: string; name: string }) => {
    if (!selected) return;
    setAddingListId(list.id);
    try {
      await listApi.addItem(selected.id, list.id, { household_product_id: product.id, requested_quantity: product.usual_quantity });
      setAddOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["households", selected.id, "shopping-lists"] });
      Alert.alert("Added to shopping list", `Added to ${list.name}`);
    } catch (error) {
      Alert.alert(error instanceof AuthApiError && error.code === "SHOPPING_LIST_PRODUCT_ALREADY_PRESENT" ? "Already on this shopping list" : "Couldn’t add product", "Choose another list or try again.");
    } finally {
      setAddingListId(undefined);
    }
  };
  const chooseSubstitute = async (substitute: { id: string }) => {
    if (!selected) return;
    setSavingSubstituteId(substitute.id);
    try {
      await productApi.substitutes(selected.id, product.id, [{ substitute_product_id: substitute.id, preference_rank: 1 }]);
      await queryClient.invalidateQueries({ queryKey: ["households", selected.id, "products", product.id] });
      setSubstituteOpen(false);
    } catch (error) {
      Alert.alert("Couldn’t save substitute", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSavingSubstituteId(undefined);
    }
  };
  const archive = () => {
    if (!selected) return;
    Alert.alert(`Archive ${product.name}?`, "It will remain in purchase history but cannot be added to new shopping lists.", [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: async () => {
        await productApi.archive(selected.id, product.id);
        await queryClient.invalidateQueries({ queryKey: ["households", selected.id, "products"] });
        router.back();
      } }
    ]);
  };
  const preferred = product.preferred_substitutes?.[0]?.substitute_name;
  const purchaseCount = summary.data?.purchase_count ?? 0;
  const options = substituteOptions.data?.filter((item) => item.id !== product.id && !item.archived_at) ?? [];

  return (
    <AppScreen>
      {product.archived_at ? <Text style={styles.archived}>Archived</Text> : null}
      <View style={styles.hero}><ProductArtwork categorySlug={product.category?.slug} imageUrl={product.image_url} name={product.name} /></View>
      <Text numberOfLines={2} style={styles.name}>{product.name}</Text>
      {product.brand ? <Text numberOfLines={2} style={styles.brand}>{product.brand}</Text> : null}
      <Text style={styles.meta}>{[product.variant, formatSize(product.size_value, product.size_unit)].filter(Boolean).join(" · ")}</Text>
      {product.category ? <Text style={styles.category}>{product.category.display_name}</Text> : null}
      <SurfaceCard style={styles.usual}><Feather color={colors.primary} name="shopping-cart" size={20} /><Text style={styles.usualText}>Usually buy {formatQuantity(product.usual_quantity)}</Text></SurfaceCard>
      {product.notes ? <><Text style={styles.section}>Notes</Text><Text style={styles.body}>{product.notes}</Text></> : null}

      <Text style={styles.section}>Preferred substitute</Text>
      <Pressable accessibilityRole="button" onPress={() => setSubstituteOpen(true)}>
        <SurfaceCard style={styles.substituteCard}>
          <View style={styles.substituteIcon}><Feather color={colors.primary} name="repeat" size={20} /></View>
          <View style={styles.flex}>
            <Text style={preferred ? styles.bodyStrong : styles.body}>{preferred ?? "Choose a substitute"}</Text>
            <Text style={styles.meta}>{preferred ? "Tap to change" : "Set a product to use when this one is unavailable."}</Text>
          </View>
          <Feather color={colors.textSecondary} name="chevron-right" size={20} />
        </SurfaceCard>
      </Pressable>

      <Text style={styles.section}>Purchase summary</Text>
      <SurfaceCard style={styles.summary}>
        <View style={styles.summaryItem}><Text style={styles.meta}>Last purchased</Text><Text style={styles.body}>{summary.data?.last_purchased_at ? new Date(summary.data.last_purchased_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: new Date(summary.data.last_purchased_at).getFullYear() === new Date().getFullYear() ? undefined : "numeric" }) : "Not purchased yet"}</Text></View>
        <View style={styles.summaryItem}><Text style={styles.meta}>Purchased</Text><Text style={styles.body}>{formatQuantity(purchaseCount)} {purchaseCount === 1 ? "time" : "times"}</Text></View>
      </SurfaceCard>
      <View style={styles.actions}>
        {!product.archived_at ? <PrimaryButton label="Add to shopping list" icon="plus" onPress={add} /> : null}
        <SecondaryButton label="View purchase history" icon="clock" onPress={() => router.push((`/products/${product.id}/history`) as never)} />
        <TertiaryButton destructive label="Archive product" icon="archive" onPress={archive} />
      </View>

      {addOpen ? <ModalSheet onClose={() => setAddOpen(false)} title="Add to shopping list">
        {lists.isLoading ? <LoadingState rows={2} /> : lists.isError ? <InlineError onRetry={() => void lists.refetch()} /> : lists.data?.length ? lists.data.map((list) => <SecondaryButton key={list.id} compact label={list.name} loading={addingListId === list.id} onPress={() => void addToList(list)} />) : <><Text style={styles.body}>Create a shopping list before adding this product.</Text><PrimaryButton label="Create shopping list" onPress={() => { setAddOpen(false); router.push("/lists/new"); }} /></>}
      </ModalSheet> : null}
      {substituteOpen ? <ModalSheet onClose={() => setSubstituteOpen(false)} title="Choose preferred substitute">
        {substituteOptions.isLoading ? <LoadingState rows={3} /> : substituteOptions.isError ? <InlineError onRetry={() => void substituteOptions.refetch()} /> : options.length ? options.map((item) => <SecondaryButton key={item.id} compact label={item.name} loading={savingSubstituteId === item.id} onPress={() => void chooseSubstitute(item)} />) : <Text style={styles.body}>Add another household product before choosing a substitute.</Text>}
        <TertiaryButton label="Cancel" onPress={() => setSubstituteOpen(false)} />
      </ModalSheet> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  hero: { height: 190, borderRadius: radius.xl, backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: spacing.lg },
  name: { ...typography.display, color: colors.text },
  brand: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  meta: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  category: { alignSelf: "flex-start", ...typography.caption, color: colors.primary, fontFamily: "AppShopSansBold", backgroundColor: colors.primarySubtle, borderRadius: radius.round, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.sm },
  usual: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, padding: spacing.md },
  usualText: { ...typography.bodyStrong, color: colors.primary, flexShrink: 1 },
  section: { ...typography.sectionTitle, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.text },
  bodyStrong: { ...typography.bodyStrong, color: colors.text },
  substituteCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  substituteIcon: { width: 42, height: 42, borderRadius: radius.round, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySubtle },
  summary: { flexDirection: "row", gap: spacing.xl, padding: spacing.md },
  summaryItem: { flex: 1, minWidth: 0 },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  archived: { alignSelf: "flex-start", color: colors.warning, backgroundColor: colors.warningSurface, borderRadius: radius.round, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.sm }
});
