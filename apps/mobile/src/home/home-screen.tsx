import { useQueries, useQuery } from "@tanstack/react-query";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth/auth-context";
import {
  AppScreen,
  EmptyState,
  HouseholdSwitcher,
  InlineError,
  LoadingState,
  QuickAction,
  SecondaryButton,
  SectionHeader,
  SurfaceCard
} from "../design/components";
import { colors, iconSizes, radius, spacing, typography } from "../design/theme";
import { useHouseholds } from "../households/household-context";
import { listApi } from "../lists/api-client";
import type { ShoppingList, ShoppingListItem } from "../lists/types";
import { memoryApi, type Memory } from "../memory/api-client";
import { pushNotificationApi } from "../notifications/api-client";
import type { SubstitutionRequest } from "../notifications/types";
import { tripApi } from "../trips/api-client";
import type { ShoppingTrip } from "../trips/types";
import { CreateHouseholdScreen } from "../screens/create-household-screen";
import { ListArtwork, ProductArtwork } from "../products/product-images";
import { purchaseCountLabel } from "../purchases/purchase-components";

type ActiveTrip = { list: ShoppingList; trip: ShoppingTrip };

function ListPreviewArtwork({ items, large = false }: { items?: ShoppingListItem[]; large?: boolean }) {
  const previewItems = items?.slice(0, 2) ?? [];
  if (!previewItems.length) {
    return <View style={[styles.neutralArtwork, large ? styles.neutralArtworkLarge : null]}><ListArtwork name="Shopping list" /></View>;
  }
  return (
    <View style={[styles.previewArtwork, large ? styles.previewArtworkLarge : null]}>
      {previewItems.map((item, index) => (
        <View key={item.id} style={[styles.previewThumb, large ? styles.previewThumbLarge : null, index ? styles.previewThumbOverlap : null]}>
          <ProductArtwork categorySlug={item.category_slug} imageUrl={item.image_url} name={item.name} />
        </View>
      ))}
    </View>
  );
}

function relativePurchase(value: string) {
  const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (elapsedDays === 0) return "Bought today";
  if (elapsedDays === 1) return "Bought yesterday";
  return `Bought ${elapsedDays} days ago`;
}

function FeatureBanner({ active, firstList, loading, onCreateList }: { active?: ActiveTrip; firstList?: ShoppingList; loading: boolean; onCreateList: () => void }) {
  const router = useRouter();
  if (loading) return <LoadingState rows={1} />;
  if (!active) {
    return (
      <SurfaceCard style={styles.featureCard}>
        <View style={styles.featureCopy}>
          <Text style={styles.featureEyebrow}>{firstList ? "Your next shop" : "Ready for the next shop?"}</Text>
          <Text numberOfLines={2} style={styles.featureTitle}>{firstList ? firstList.name : "Create your first list"}</Text>
          <Text style={[styles.secondary, styles.featureSecondary]}>{firstList ? `${firstList.item_count} item${firstList.item_count === 1 ? "" : "s"} ready to shop.` : "Keep the household on the same page."}</Text>
          <View style={styles.featureButton}><SecondaryButton compact fullWidth={false} icon={firstList ? "arrow-right" : "plus"} label={firstList ? "Open list" : "Create your first list"} onPress={() => firstList ? router.push(`/lists/${firstList.id}`) : onCreateList()} /></View>
        </View>
        <View accessibilityElementsHidden style={styles.featureImage}><ListPreviewArtwork items={firstList?.items} large /></View>
      </SurfaceCard>
    );
  }
  const { list, trip } = active;
  const progress = trip.progress.total ? trip.progress.collected / trip.progress.total : 0;
  return (
    <SurfaceCard accessibilityLabel="Shopping in progress" style={[styles.featureCard, styles.activeCard]}>
      <View style={styles.featureCopy}>
        <View style={styles.activityLabel}><Feather color={colors.success} name="shopping-cart" size={16} /><Text style={styles.activityText}>Shopping in progress</Text></View>
        <Text style={styles.featureTitle}>{list.name}</Text>
        <Text style={[styles.secondary, styles.featureSecondary]}>{trip.progress.collected} of {trip.progress.total} collected</Text>
        <View accessibilityLabel={`${Math.round(progress * 100)} percent complete`} accessibilityRole="progressbar" style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
        <View style={styles.featureButton}><SecondaryButton compact fullWidth={false} icon="arrow-right" label="Continue shopping" onPress={() => router.push(`/trip/${trip.id}`)} /></View>
      </View>
      <View accessibilityElementsHidden style={styles.featureImage}><ListPreviewArtwork items={list.items} large /></View>
    </SurfaceCard>
  );
}

function ListPreview({ lists, loading, error, retry }: { lists?: ShoppingList[]; loading: boolean; error: boolean; retry: () => void }) {
  const router = useRouter();
  if (loading) return <LoadingState />;
  if (error) return <InlineError onRetry={retry} />;
  if (!lists?.length) {
    return <EmptyState icon="list" title="No shopping lists yet" body="Your first list will appear here as soon as you create it above." />;
  }
  return (
    <View style={styles.listStack}>
      {lists.slice(0, 2).map((list) => (
        <Pressable accessibilityRole="button" key={list.id} onPress={() => router.push(`/lists/${list.id}`)} style={({ pressed }) => [styles.listCard, pressed ? styles.pressed : null]}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.listArtwork}><ListPreviewArtwork items={list.items} /></View>
          <View style={styles.listCopy}>
            <Text numberOfLines={2} style={styles.cardTitle}>{list.name}</Text>
            <Text style={styles.secondary}>{list.item_count} item{list.item_count === 1 ? "" : "s"}</Text>
            {list.items?.length ? <Text numberOfLines={1} style={styles.contentsPreview}>{list.items.slice(0, 3).map((item) => item.name).join(" · ")}</Text> : null}
          </View>
          <Feather color={colors.textSecondary} name="chevron-right" size={20} />
        </Pressable>
      ))}
    </View>
  );
}

function Attention({ items }: { items: SubstitutionRequest[] }) {
  const router = useRouter();
  if (!items.length) return null;
  const item = items[0]!;
  const details = [item.proposed_brand, item.proposed_name].filter(Boolean).join(" ");
  return (
    <>
      <SectionHeader title="Needs your attention" />
      <Pressable accessibilityRole="button" onPress={() => router.push(`/substitutions/${item.id}`)} style={({ pressed }) => [styles.attentionCard, pressed ? styles.pressed : null]}>
        <View style={styles.attentionIcon}><Feather color={colors.warning} name="repeat" size={iconSizes.md} /></View>
        <View style={styles.flex}><Text style={styles.cardTitle}>Replacement approval</Text><Text numberOfLines={2} style={styles.secondary}>{details}</Text></View>
        <Feather color={colors.warning} name="chevron-right" size={iconSizes.md} />
      </Pressable>
    </>
  );
}

function MemoryPreview({ title, items, loading, error, retry, frequent = false }: { title: string; items?: Memory[]; loading: boolean; error: boolean; retry: () => void; frequent?: boolean }) {
  const router = useRouter();
  return (
    <>
      <SectionHeader actionLabel="See all" onAction={() => router.push("/purchasing-memory")} title={title} />
      {loading ? <LoadingState rows={1} /> : error ? <InlineError onRetry={retry} /> : !items?.length ? (
        <Text style={styles.quietEmpty}>{frequent ? "Frequently bought products will appear here as your shopping history grows." : "No purchases yet. Your household’s shopping memory will build as trips are completed."}</Text>
      ) : (
        <SurfaceCard style={styles.memoryCard}>
          {items.slice(0, frequent ? 2 : 3).map((item, index) => (
            <View key={item.household_product_id} style={[styles.memoryRow, index ? styles.divider : null]}>
              <View style={styles.memoryImage}><ProductArtwork name={item.name} /></View>
              <View style={styles.flex}><Text numberOfLines={1} style={styles.cardTitle}>{item.name}</Text><Text style={styles.secondary}>{frequent ? purchaseCountLabel(item.purchase_count) : relativePurchase(item.last_purchased_at)}</Text></View>
            </View>
          ))}
        </SurfaceCard>
      )}
    </>
  );
}

function HomeContent({ householdId }: { householdId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { selected } = useHouseholds();
  const lists = useQuery({ queryKey: ["households", householdId, "shopping-lists"], queryFn: () => listApi.lists(householdId) });
  const recent = useQuery({ queryKey: ["households", householdId, "purchasing-memory", "recent"], queryFn: () => memoryApi.recent(householdId) });
  const frequent = useQuery({ queryKey: ["households", householdId, "purchasing-memory", "frequent"], queryFn: () => memoryApi.frequent(householdId) });
  const substitutions = useQuery({ queryKey: ["households", householdId, "substitutions", "pending"], queryFn: () => pushNotificationApi.listPendingSubstitutions(householdId) });
  const activeTrips = useQueries({
    queries: (lists.data ?? []).map((list) => ({
      queryKey: ["households", householdId, "shopping-lists", list.id, "active-trip"],
      queryFn: () => tripApi.active(householdId, list.id)
    }))
  });
  const active = activeTrips.reduce<ActiveTrip | undefined>((found, query, index) => {
    const list = lists.data?.[index];
    return found ?? (query.data && list ? { list, trip: query.data } : undefined);
  }, undefined);
  const actionable = (substitutions.data ?? []).filter((item) => item.requested_by_user_id !== user?.id);
  const activeLoading = lists.isLoading || activeTrips.some((query) => query.isLoading);

  return (
    <AppScreen testID={`home-${householdId}`}>
      <HouseholdSwitcher name={selected?.name ?? "Household"} onPress={() => router.push("/households")} />

      <FeatureBanner active={active} firstList={lists.data?.[0]} loading={activeLoading} onCreateList={() => router.push("/lists/new")} />

      {!substitutions.isLoading && !substitutions.isError ? <Attention items={actionable} /> : null}
      {substitutions.isError ? <><SectionHeader title="Needs your attention" /><InlineError onRetry={() => void substitutions.refetch()} /></> : null}

      <SectionHeader actionLabel="See all" onAction={() => router.push("/lists")} title="Shopping Lists" />
      <ListPreview error={lists.isError} lists={lists.data} loading={lists.isLoading} retry={() => void lists.refetch()} />

      <MemoryPreview error={recent.isError} items={recent.data?.items} loading={recent.isLoading} retry={() => void recent.refetch()} title="Buy Again" />
      <MemoryPreview error={frequent.isError} frequent items={frequent.data?.items} loading={frequent.isLoading} retry={() => void frequent.refetch()} title="Frequently bought" />

      <SectionHeader title="Quick actions" />
      <View style={styles.quickActions}>
        <QuickAction icon="plus-square" label="New list" onPress={() => router.push("/lists/new")} />
        <QuickAction icon="package" label="Add product" onPress={() => router.push("/products/new")} />
        {selected?.role === "owner" ? <QuickAction icon="user-plus" label="Invite member" onPress={() => router.push("/invite")} /> : null}
      </View>
    </AppScreen>
  );
}

export function HomeScreen() {
  const { loading, households, selected } = useHouseholds();
  if (loading) return <AppScreen><LoadingState rows={4} /></AppScreen>;
  if (!households.length || !selected) {
    return <CreateHouseholdScreen />;
  }
  return <HomeContent householdId={selected.id} key={selected.id} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.78 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  cardTitle: { ...typography.cardTitle, color: colors.text },
  secondary: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  roundIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: colors.primarySubtle },
  featureCard: { overflow: "hidden", flexDirection: "row", gap: spacing.md, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.primary, borderColor: colors.primary },
  featureCopy: { flex: 1, minWidth: 0, zIndex: 1 },
  featureEyebrow: { ...typography.caption, color: colors.sage, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  featureTitle: { ...typography.sectionTitle, color: colors.surface, marginTop: spacing.xs },
  featureSecondary: { color: "#E9F0E5" },
  featureButton: { alignSelf: "flex-start", marginTop: spacing.sm },
  featureImage: { width: 108, height: 92, alignSelf: "center", justifyContent: "center" },
  activeCard: { borderColor: colors.primary },
  activityLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  activityText: { ...typography.caption, color: colors.success, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  progressTrack: { height: 7, overflow: "hidden", borderRadius: radius.round, backgroundColor: colors.primarySubtle, marginTop: spacing.md },
  progressFill: { height: "100%", backgroundColor: colors.success, borderRadius: radius.round },
  listStack: { gap: spacing.sm },
  listCard: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.sm },
  listArtwork: { width: 82, height: 72 },
  listCopy: { flex: 1, minWidth: 0 },
  contentsPreview: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  previewArtwork: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  previewArtworkLarge: { justifyContent: "flex-end" },
  previewThumb: { width: 54, height: 64, overflow: "hidden", borderRadius: radius.md, backgroundColor: colors.primarySubtle, borderWidth: 2, borderColor: colors.surface },
  previewThumbLarge: { width: 66, height: 82 },
  previewThumbOverlap: { marginLeft: -20 },
  neutralArtwork: { width: 64, height: 64, alignSelf: "center", overflow: "hidden", borderRadius: radius.md, backgroundColor: colors.primarySubtle },
  neutralArtworkLarge: { width: 88, height: 88, backgroundColor: colors.surface },
  attentionCard: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.warningSurface, borderRadius: radius.lg, padding: spacing.lg },
  attentionIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: "#FFE7B2" },
  quietEmpty: { ...typography.secondary, color: colors.textSecondary, borderLeftWidth: 3, borderLeftColor: colors.primarySubtle, paddingLeft: spacing.md, paddingVertical: spacing.sm },
  memoryCard: { paddingVertical: spacing.xs },
  memoryRow: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  memoryIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySubtle },
  memoryImage: { width: 48, height: 48, overflow: "hidden", borderRadius: radius.md, backgroundColor: colors.primarySubtle },
  quickActions: { flexDirection: "row", gap: spacing.sm }
});
