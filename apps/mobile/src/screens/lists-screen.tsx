import Feather from "@expo/vector-icons/Feather";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth/auth-context";
import { AppHeader, AppScreen, Badge, EmptyState, HouseholdSwitcher, InlineError, LoadingState, PrimaryButton, SecondaryButton, SurfaceCard } from "../design/components";
import { colors, iconSizes, radius, spacing, typography } from "../design/theme";
import { useHouseholds } from "../households/household-context";
import { listApi } from "../lists/api-client";
import { ShoppingListCard } from "../lists/list-components";
import type { ShoppingList } from "../lists/types";
import { pushNotificationApi } from "../notifications/api-client";
import type { SubstitutionRequest } from "../notifications/types";
import { tripApi } from "../trips/api-client";
import type { ShoppingTrip, TripItem } from "../trips/types";

type Filter = "all" | "current" | "archived";
type ActiveTrip = { list: ShoppingList; trip: ShoppingTrip };

function ActiveTripHero({ active, activeCount, onOpenList, onResume }: { active: ActiveTrip; activeCount: number; onOpenList: () => void; onResume: () => void }) {
  const { list, trip } = active;
  const progress = trip.progress.total ? trip.progress.collected / trip.progress.total : 0;
  return <SurfaceCard accessibilityLabel="Active shopping trip" style={styles.tripHero}>
    <View style={styles.heroTop}><Badge label={activeCount > 1 ? `${activeCount} active trips` : "Active trip"} tone="success" /><Feather color={colors.primary} name="shopping-cart" size={iconSizes.md} /></View>
    <Text numberOfLines={2} style={styles.heroTitle}>{list.name}</Text>
    {trip.store_name ? <Text numberOfLines={2} style={styles.heroMeta}>{trip.store_name}</Text> : null}
    <View style={styles.heroProgressCopy}><Text style={styles.heroProgressText}>{trip.progress.collected} of {trip.progress.total} collected</Text><Text style={styles.heroProgressText}>{Math.round(progress * 100)}%</Text></View>
    <View accessibilityLabel={`${Math.round(progress * 100)} percent collected`} accessibilityRole="progressbar" style={styles.heroTrack}><View style={[styles.heroFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
    <View style={styles.heroActions}><PrimaryButton compact label="Resume trip" icon="arrow-right" onPress={onResume} style={styles.heroAction} /><SecondaryButton compact label="Open list" onPress={onOpenList} style={styles.heroAction} /></View>
  </SurfaceCard>;
}

function SubstitutionCard({ item, original, busy, error, onApprove, onReject, onReview }: { item: SubstitutionRequest; original?: TripItem; busy: boolean; error: boolean; onApprove: () => void; onReject: () => void; onReview: () => void }) {
  return <SurfaceCard accessibilityLabel="Replacement approval needed" style={styles.substitutionCard}>
    <View style={styles.substitutionHeader}><View style={styles.substitutionHeading}><Feather color={colors.warning} name="repeat" size={18} /><Text style={styles.substitutionLabel}>Replacement request</Text></View><Badge label="Needs approval" tone="warning" /></View>
    {original ? <Text numberOfLines={2} style={styles.originalName}>{original.name}</Text> : null}
    <View style={styles.replacementRow}><Feather color={colors.success} name="corner-down-right" size={18} /><View style={styles.flex}><Text style={styles.replacementOverline}>Proposed replacement</Text><Text numberOfLines={2} style={styles.replacementName}>{item.proposed_name}</Text></View></View>
    {error ? <Text accessibilityRole="alert" style={styles.mutationError}>Couldn’t update this request. It may already be resolved.</Text> : null}
    <View style={styles.substitutionActions}><PrimaryButton compact disabled={busy} loading={busy} label="Approve" icon="check" onPress={onApprove} style={styles.flexAction} /><SecondaryButton compact disabled={busy} label="Reject" onPress={onReject} style={styles.flexAction} /></View>
    <Pressable accessibilityRole="button" disabled={busy} onPress={onReview} style={styles.reviewAction}><Text style={styles.reviewText}>Review details</Text><Feather color={colors.primary} name="arrow-right" size={16} /></Pressable>
  </SurfaceCard>;
}

function FilterBar({ value, onChange }: { value: Filter; onChange: (value: Filter) => void }) {
  const options: { value: Filter; label: string }[] = [{ value: "all", label: "All" }, { value: "current", label: "Current" }, { value: "archived", label: "Archived" }];
  return <View accessibilityRole="tablist" style={styles.filters}>{options.map((option) => {
    const selected = value === option.value;
    return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={option.value} onPress={() => onChange(option.value)} style={[styles.filter, selected ? styles.filterSelected : null]}><Text numberOfLines={1} style={[styles.filterText, selected ? styles.filterTextSelected : null]}>{option.label}</Text></Pressable>;
  })}</View>;
}

export function ListsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selected } = useHouseholds();
  const [filter, setFilter] = useState<Filter>("all");
  const lists = useQuery({ queryKey: ["households", selected?.id, "shopping-lists"], queryFn: () => listApi.lists(selected!.id), enabled: Boolean(selected) });
  const withArchived = useQuery({ queryKey: ["households", selected?.id, "shopping-lists", "with-archived"], queryFn: () => listApi.lists(selected!.id, true), enabled: Boolean(selected) });
  const substitutions = useQuery({ queryKey: ["households", selected?.id, "substitutions", "pending"], queryFn: () => pushNotificationApi.listPendingSubstitutions(selected!.id), enabled: Boolean(selected) });
  const currentLists = lists.data ?? [];
  const activeTripQueries = useQueries({ queries: currentLists.map((list) => ({ queryKey: ["households", selected?.id, "shopping-lists", list.id, "active-trip"], queryFn: () => tripApi.active(selected!.id, list.id), enabled: Boolean(selected) })) });
  const activeTrips = activeTripQueries.reduce<ActiveTrip[]>((items, query, index) => { const list = currentLists[index]; if (list && query.data) items.push({ list, trip: query.data }); return items; }, []);
  const tripForList = (listId: string) => activeTrips.find((entry) => entry.list.id === listId)?.trip ?? null;
  const archivedLists = (withArchived.data ?? []).filter((list) => list.status === "archived");
  const visibleLists = filter === "archived" ? archivedLists : filter === "current" ? currentLists : [...currentLists, ...archivedLists];
  const firstSubstitution = (substitutions.data ?? []).find((item) => item.requested_by_user_id !== user?.id);
  const originalItem = firstSubstitution ? activeTrips.flatMap((entry) => entry.trip.items).find((item) => item.id === firstSubstitution.trip_item_id) : undefined;
  const decision = useMutation({
    mutationFn: ({ item, value }: { item: SubstitutionRequest; value: "approve" | "reject" }) => pushNotificationApi.decide(selected!.id, item.id, value),
    onSuccess: async (resolved) => { if (!selected) return; await Promise.all([queryClient.invalidateQueries({ queryKey: ["households", selected.id, "substitutions"] }), queryClient.invalidateQueries({ queryKey: ["households", selected.id, "trips", resolved.shopping_trip_id] }), queryClient.invalidateQueries({ queryKey: ["households", selected.id, "shopping-lists"] })]); }
  });
  const refresh = () => void Promise.all([lists.refetch(), withArchived.refetch(), substitutions.refetch(), ...activeTripQueries.map((query) => query.refetch())]);
  const listDataLoading = lists.isLoading || (filter !== "current" && withArchived.isLoading);
  const listDataError = lists.isError || (filter !== "current" && withArchived.isError);
  const activeTripsLoading = lists.isLoading || activeTripQueries.some((query) => query.isLoading);

  return <AppScreen contentStyle={styles.content} refreshControl={<RefreshControl refreshing={lists.isRefetching || withArchived.isRefetching} onRefresh={refresh} />}>
    <HouseholdSwitcher name={selected?.name ?? "Household"} onPress={() => router.push("/households")} />
    <AppHeader title="Lists & Trips" subtitle="Shared lists and active shopping trips." right={<PrimaryButton compact fullWidth={false} icon="plus" label="New list" onPress={() => router.push("/lists/new")} style={styles.newListButton} />} />
    {activeTripsLoading ? <LoadingState rows={1} /> : activeTrips[0] ? <ActiveTripHero active={activeTrips[0]} activeCount={activeTrips.length} onOpenList={() => router.push(`/lists/${activeTrips[0]!.list.id}`)} onResume={() => router.push(`/trip/${activeTrips[0]!.trip.id}`)} /> : activeTripQueries.some((query) => query.isError) ? <InlineError message="Couldn’t check active trips." onRetry={() => void Promise.all(activeTripQueries.map((query) => query.refetch()))} /> : null}
    {substitutions.isLoading ? <View style={styles.approvalLoading}><LoadingState rows={1} /></View> : substitutions.isError ? <InlineError message="Couldn’t load replacement requests." onRetry={() => void substitutions.refetch()} /> : firstSubstitution ? <SubstitutionCard item={firstSubstitution} original={originalItem} busy={decision.isPending} error={decision.isError} onApprove={() => decision.mutate({ item: firstSubstitution, value: "approve" })} onReject={() => decision.mutate({ item: firstSubstitution, value: "reject" })} onReview={() => router.push(`/substitutions/${firstSubstitution.id}`)} /> : null}
    <View style={styles.listSectionHeader}><View style={styles.flex}><Text style={styles.sectionTitle}>Shopping lists</Text><Text style={styles.sectionCount}>{visibleLists.length} {filter === "archived" ? "archived" : filter === "current" ? "current" : "total"}</Text></View><Feather color={colors.textTertiary} name="sliders" size={iconSizes.sm} /></View>
    <FilterBar value={filter} onChange={setFilter} />
    {listDataLoading ? <LoadingState rows={3} /> : listDataError ? <InlineError message="Couldn’t load shopping lists." onRetry={() => void Promise.all([lists.refetch(), withArchived.refetch()])} /> : visibleLists.length === 0 ? filter === "archived" ? <EmptyState icon="archive" title="No archived lists" body="Lists you archive will appear here." /> : <EmptyState icon="list" title="No shopping lists yet" body="Create a list and start adding what your household needs." action={<PrimaryButton label="Create list" icon="plus" onPress={() => router.push("/lists/new")} />} /> : <View style={styles.cards}>{visibleLists.map((list) => { const trip = tripForList(list.id); return <ShoppingListCard archived={list.status === "archived"} activeTrip={trip} key={list.id} list={list} onContinue={trip ? () => router.push(`/trip/${trip.id}`) : undefined} onOpen={() => router.push(`/lists/${list.id}`)} />; })}</View>}
  </AppScreen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  newListButton: { minHeight: 44, paddingHorizontal: spacing.md },
  tripHero: { gap: spacing.xs, marginBottom: spacing.md, borderRadius: radius.lg, borderColor: colors.borderSubtle, backgroundColor: colors.surface, padding: spacing.sm },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  heroTitle: { ...typography.h3, color: colors.text },
  heroMeta: { ...typography.bodySmall, color: colors.textSecondary },
  heroProgressCopy: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  heroProgressText: { ...typography.caption, color: colors.textSecondary },
  heroTrack: { height: 7, overflow: "hidden", borderRadius: radius.round, backgroundColor: colors.primaryMuted },
  heroFill: { height: "100%", borderRadius: radius.round, backgroundColor: colors.success },
  heroActions: { flexDirection: "row", gap: spacing.xs },
  heroAction: { flex: 1, minWidth: 0 },
  approvalLoading: { marginBottom: spacing.md },
  substitutionCard: { gap: spacing.sm, marginBottom: spacing.md, borderColor: colors.warningLight, backgroundColor: colors.warningLight, borderRadius: radius.lg },
  substitutionHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  substitutionHeading: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  substitutionLabel: { ...typography.overline, color: colors.warning, flexShrink: 1 },
  originalName: { ...typography.bodySmall, color: colors.textSecondary, textDecorationLine: "line-through" },
  replacementRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.surface, padding: spacing.sm },
  replacementOverline: { ...typography.overline, color: colors.success },
  replacementName: { ...typography.cardTitle, color: colors.text, marginTop: 2 },
  mutationError: { ...typography.bodySmall, color: colors.error },
  substitutionActions: { flexDirection: "row", gap: spacing.xs },
  flexAction: { flex: 1, minWidth: 0 },
  reviewAction: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  reviewText: { ...typography.caption, color: colors.primary },
  listSectionHeader: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginTop: spacing.xs },
  sectionTitle: { ...typography.h3, color: colors.text },
  sectionCount: { ...typography.bodySmall, color: colors.textSecondary },
  filters: { flexDirection: "row", gap: spacing.xs, borderRadius: radius.md, backgroundColor: colors.surfaceSubtle, padding: spacing.xxs, marginBottom: spacing.md },
  filter: { flex: 1, minWidth: 0, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, paddingHorizontal: spacing.xs },
  filterSelected: { backgroundColor: colors.surface },
  filterText: { ...typography.caption, color: colors.textSecondary },
  filterTextSelected: { color: colors.text },
  cards: { gap: spacing.sm }
});
