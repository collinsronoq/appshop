import { useQueries, useQuery } from "@tanstack/react-query";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth/auth-context";
import {
  AppHeader,
  AppScreen,
  EmptyState,
  HouseholdSwitcher,
  InlineError,
  LoadingState,
  PrimaryButton,
  QuickAction,
  SectionHeader,
  SurfaceCard
} from "../design/components";
import { colors, iconSizes, radius, spacing, typography } from "../design/theme";
import { useHouseholds } from "../households/household-context";
import { listApi } from "../lists/api-client";
import type { ShoppingList } from "../lists/types";
import { memoryApi, type Memory } from "../memory/api-client";
import { pushNotificationApi } from "../notifications/api-client";
import type { SubstitutionRequest } from "../notifications/types";
import { tripApi } from "../trips/api-client";
import type { ShoppingTrip } from "../trips/types";
import { CreateHouseholdScreen } from "../screens/create-household-screen";

type ActiveTrip = { list: ShoppingList; trip: ShoppingTrip };

function greeting(name?: string) {
  const hour = new Date().getHours();
  const salutation = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${salutation}${name ? `, ${name}` : ""}`;
}

function relativePurchase(value: string) {
  const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (elapsedDays === 0) return "Bought today";
  if (elapsedDays === 1) return "Bought yesterday";
  return `Bought ${elapsedDays} days ago`;
}

function ActiveShopping({ active, loading, onCreateList }: { active?: ActiveTrip; loading: boolean; onCreateList: () => void }) {
  const router = useRouter();
  if (loading) return <LoadingState rows={1} />;
  if (!active) {
    return (
      <SurfaceCard style={styles.nextShopCard}>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Ready for the next shop?</Text>
            <Text style={styles.secondary}>Create a list or start from one you already have.</Text>
          </View>
          <View style={styles.roundIcon}><Feather color={colors.primary} name="shopping-cart" size={iconSizes.md} /></View>
        </View>
        <View style={styles.cardAction}><PrimaryButton label="New shopping list" onPress={onCreateList} /></View>
      </SurfaceCard>
    );
  }
  const { list, trip } = active;
  const progress = trip.progress.total ? trip.progress.collected / trip.progress.total : 0;
  return (
    <SurfaceCard accessibilityLabel="Shopping in progress" style={styles.activeCard}>
      <View style={styles.activityLabel}><Feather color={colors.success} name="shopping-cart" size={16} /><Text style={styles.activityText}>Shopping in progress</Text></View>
      <Text style={styles.activeTitle}>{list.name}</Text>
      <Text style={styles.secondary}>{trip.progress.collected} of {trip.progress.total} collected</Text>
      <View accessibilityLabel={`${Math.round(progress * 100)} percent complete`} accessibilityRole="progressbar" style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <View style={styles.cardAction}><PrimaryButton icon="arrow-right" label="Continue shopping" onPress={() => router.push(`/trip/${trip.id}`)} /></View>
    </SurfaceCard>
  );
}

function ListPreview({ lists, loading, error, retry }: { lists?: ShoppingList[]; loading: boolean; error: boolean; retry: () => void }) {
  const router = useRouter();
  if (loading) return <LoadingState />;
  if (error) return <InlineError onRetry={retry} />;
  if (!lists?.length) {
    return <EmptyState icon="list" title="No shopping lists yet" body="Create your first list and start adding what the household needs." action={<PrimaryButton label="Create shopping list" onPress={() => router.push("/lists")} />} />;
  }
  return (
    <View style={styles.listGrid}>
      {lists.slice(0, 2).map((list) => (
        <Pressable accessibilityRole="button" key={list.id} onPress={() => router.push(`/lists/${list.id}`)} style={({ pressed }) => [styles.listCard, pressed ? styles.pressed : null]}>
          <Text numberOfLines={1} style={styles.cardTitle}>{list.name}</Text>
          <Text style={styles.secondary}>{list.item_count} item{list.item_count === 1 ? "" : "s"}</Text>
          <Feather color={colors.textSecondary} name="chevron-right" size={18} style={styles.chevron} />
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
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/trip/[tripId]", params: { tripId: item.shopping_trip_id, substitutionId: item.id } })} style={({ pressed }) => [styles.attentionCard, pressed ? styles.pressed : null]}>
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
              <View style={styles.memoryIcon}><Feather color={colors.primary} name={frequent ? "repeat" : "clock"} size={18} /></View>
              <View style={styles.flex}><Text numberOfLines={1} style={styles.cardTitle}>{item.name}</Text><Text style={styles.secondary}>{frequent ? `Bought ${item.purchase_count} times` : relativePurchase(item.last_purchased_at)}</Text></View>
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
      <AppHeader
        title={greeting(user?.display_name)}
        right={<Pressable accessibilityLabel="Open profile" accessibilityRole="button" onPress={() => router.push("/profile")} style={styles.avatar}><Text style={styles.avatarText}>{user?.display_name?.slice(0, 1).toUpperCase() ?? "U"}</Text></Pressable>}
      />
      <HouseholdSwitcher name={selected?.name ?? "Household"} onPress={() => router.push("/households")} />

      <SectionHeader title="Active shopping" />
      <ActiveShopping active={active} loading={activeLoading} onCreateList={() => router.push("/lists")} />

      <SectionHeader actionLabel="See all" onAction={() => router.push("/lists")} title="Shopping Lists" />
      <ListPreview error={lists.isError} lists={lists.data} loading={lists.isLoading} retry={() => void lists.refetch()} />

      {!substitutions.isLoading && !substitutions.isError ? <Attention items={actionable} /> : null}
      {substitutions.isError ? <><SectionHeader title="Needs your attention" /><InlineError onRetry={() => void substitutions.refetch()} /></> : null}

      <MemoryPreview error={recent.isError} items={recent.data?.items} loading={recent.isLoading} retry={() => void recent.refetch()} title="Recently purchased" />
      <MemoryPreview error={frequent.isError} frequent items={frequent.data?.items} loading={frequent.isLoading} retry={() => void frequent.refetch()} title="Frequently bought" />

      <SectionHeader title="Quick actions" />
      <View style={styles.quickActions}>
        <QuickAction icon="plus-square" label="New list" onPress={() => router.push("/lists")} />
        <QuickAction icon="package" label="Add product" onPress={() => router.push("/products/new")} />
        <QuickAction icon="user-plus" label="Invite member" onPress={() => router.push("/invite")} />
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
  avatar: { width: 44, height: 44, borderRadius: radius.round, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  avatarText: { ...typography.cardTitle, color: colors.surface },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  cardTitle: { ...typography.cardTitle, color: colors.text },
  secondary: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  roundIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: colors.primarySubtle },
  nextShopCard: { padding: spacing.lg },
  cardAction: { marginTop: spacing.lg },
  activeCard: { borderColor: "#C9DACD" },
  activityLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  activityText: { ...typography.caption, color: colors.success, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  activeTitle: { ...typography.sectionTitle, color: colors.text, marginTop: spacing.md },
  progressTrack: { height: 7, overflow: "hidden", borderRadius: radius.round, backgroundColor: colors.primarySubtle, marginTop: spacing.md },
  progressFill: { height: "100%", backgroundColor: colors.success, borderRadius: radius.round },
  listGrid: { flexDirection: "row", gap: spacing.sm },
  listCard: { flex: 1, minHeight: 88, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, paddingRight: spacing.xxl },
  chevron: { position: "absolute", right: spacing.sm, top: 34 },
  attentionCard: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.warningSurface, borderRadius: radius.lg, padding: spacing.lg },
  attentionIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: "#FFE7B2" },
  quietEmpty: { ...typography.secondary, color: colors.textSecondary, borderLeftWidth: 3, borderLeftColor: colors.primarySubtle, paddingLeft: spacing.md, paddingVertical: spacing.sm },
  memoryCard: { paddingVertical: spacing.xs },
  memoryRow: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  memoryIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySubtle },
  quickActions: { flexDirection: "row", gap: spacing.sm }
});
