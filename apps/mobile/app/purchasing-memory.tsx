import Feather from "@expo/vector-icons/Feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthApiError } from "../src/auth/api-client";
import { AppScreen, BackHeader, EmptyState, InlineError, LoadingState, ModalSheet, PrimaryButton, SecondaryButton, SectionHeader, TertiaryButton } from "../src/design/components";
import { colors, radius, spacing, typography } from "../src/design/theme";
import { useHouseholds } from "../src/households/household-context";
import { listApi } from "../src/lists/api-client";
import { memoryApi, type Memory } from "../src/memory/api-client";
import { MemoryProductCard } from "../src/purchases/purchase-components";

type BuyAgainResult = { kind: "success" | "duplicate" | "error"; message: string } | null;

export default function PurchasingMemory() {
  const router = useRouter();
  const { selected } = useHouseholds();
  const queryClient = useQueryClient();
  const [buying, setBuying] = useState<Memory | null>(null);
  const [addingListId, setAddingListId] = useState<string>();
  const [result, setResult] = useState<BuyAgainResult>(null);
  const recent = useQuery({ queryKey: ["households", selected?.id, "purchasing-memory", "recent"], queryFn: () => memoryApi.recent(selected!.id), enabled: Boolean(selected) });
  const frequent = useQuery({ queryKey: ["households", selected?.id, "purchasing-memory", "frequent"], queryFn: () => memoryApi.frequent(selected!.id), enabled: Boolean(selected) });
  const lists = useQuery({ queryKey: ["households", selected?.id, "shopping-lists"], queryFn: () => listApi.lists(selected!.id), enabled: Boolean(selected && buying) });

  const closeSheet = () => {
    if (addingListId) return;
    setBuying(null);
    setResult(null);
  };
  const beginBuyAgain = (item: Memory) => {
    setResult(null);
    setBuying(item);
  };
  const add = async (list: { id: string; name: string }) => {
    if (!selected || !buying) return;
    setAddingListId(list.id);
    setResult(null);
    try {
      await listApi.addItem(selected.id, list.id, { household_product_id: buying.household_product_id, requested_quantity: buying.usual_quantity });
      await queryClient.invalidateQueries({ queryKey: ["households", selected.id, "shopping-lists"] });
      setResult({ kind: "success", message: `${buying.name} was added to ${list.name}.` });
    } catch (error) {
      setResult(error instanceof AuthApiError && error.code === "SHOPPING_LIST_PRODUCT_ALREADY_PRESENT"
        ? { kind: "duplicate", message: `${buying.name} is already on ${list.name}. Choose another list or cancel.` }
        : { kind: "error", message: "This product couldn’t be added. Try again or choose another list." });
    } finally {
      setAddingListId(undefined);
    }
  };

  if (recent.isLoading || frequent.isLoading) return <AppScreen><BackHeader title="Buy Again" onBack={() => router.back()} /><LoadingState rows={5} /></AppScreen>;
  if (recent.isError || frequent.isError) return <AppScreen><BackHeader title="Buy Again" onBack={() => router.back()} /><InlineError onRetry={() => { void recent.refetch(); void frequent.refetch(); }} /></AppScreen>;
  const recentItems = recent.data?.items ?? [];
  const frequentItems = frequent.data?.items ?? [];
  if (!recentItems.length && !frequentItems.length) return <AppScreen><BackHeader title="Buy Again" onBack={() => router.back()} /><EmptyState icon="repeat" title="Nothing to buy again yet" body="Complete a shopping trip and the products your household buys repeatedly will appear here." /></AppScreen>;

  return (
    <AppScreen>
      <BackHeader title="Buy Again" subtitle="Things your household buys repeatedly." onBack={() => router.back()} />
      <SectionHeader title="Recently purchased" />
      {recentItems.map((item) => <MemoryProductCard key={item.household_product_id} item={item} onOpen={() => router.push(`/products/${item.household_product_id}`)} onBuy={() => beginBuyAgain(item)} />)}
      <SectionHeader title="Frequently bought" />
      {frequentItems.map((item) => <MemoryProductCard key={item.household_product_id} item={item} frequent onOpen={() => router.push(`/products/${item.household_product_id}`)} onBuy={() => beginBuyAgain(item)} />)}
      {buying ? <ModalSheet onClose={closeSheet} title={result?.kind === "success" ? "Added to list" : `Add ${buying.name} to`}>
        {result?.kind === "success" ? (
          <View accessibilityRole="alert" style={styles.success}>
            <View style={styles.statusIcon}><Feather color={colors.success} name="check" size={22} /></View>
            <Text style={styles.statusTitle}>Ready for your next shop</Text>
            <Text style={styles.statusMessage}>{result.message}</Text>
            <PrimaryButton label="Done" onPress={closeSheet} />
          </View>
        ) : (
          <>
            {result ? <View accessibilityRole="alert" style={[styles.feedback, result.kind === "duplicate" ? styles.duplicate : styles.failure]}><Feather color={result.kind === "duplicate" ? colors.warning : colors.danger} name={result.kind === "duplicate" ? "info" : "alert-circle"} size={20} /><Text style={styles.feedbackText}>{result.message}</Text></View> : null}
            {lists.isLoading ? <LoadingState rows={2} /> : lists.isError ? <InlineError onRetry={() => void lists.refetch()} /> : lists.data?.length ? lists.data.map((list) => <SecondaryButton key={list.id} compact disabled={Boolean(addingListId)} label={list.name} loading={addingListId === list.id} onPress={() => void add(list)} />) : <View style={styles.emptyLists}><Text style={styles.statusMessage}>You don’t have an active shopping list yet.</Text><PrimaryButton label="Create shopping list" onPress={() => { closeSheet(); router.push("/lists/new"); }} /></View>}
            <TertiaryButton label="Cancel" onPress={closeSheet} />
          </>
        )}
      </ModalSheet> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  success: { alignItems: "center", gap: spacing.md },
  statusIcon: { width: 52, height: 52, borderRadius: radius.round, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySubtle },
  statusTitle: { ...typography.sectionTitle, color: colors.text, textAlign: "center" },
  statusMessage: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  feedback: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, borderRadius: radius.md, padding: spacing.md },
  duplicate: { backgroundColor: colors.warningSurface },
  failure: { backgroundColor: colors.dangerSurface },
  feedbackText: { ...typography.secondary, color: colors.text, flex: 1 },
  emptyLists: { gap: spacing.md }
});
