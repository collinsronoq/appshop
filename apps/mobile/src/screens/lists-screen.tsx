import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";

import { AppHeader, AppScreen, AppTopBar, EmptyState, IconButton, InlineError, LoadingState, SectionHeader } from "../design/components";
import { useAuth } from "../auth/auth-context";
import { colors, spacing, typography } from "../design/theme";
import { useHouseholds } from "../households/household-context";
import { listApi } from "../lists/api-client";
import { ShoppingListCard, EmptyArchived } from "../lists/list-components";
import { tripApi } from "../trips/api-client";
import type { ShoppingTrip } from "../trips/types";

export function ListsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selected } = useHouseholds();
  const [showArchived, setShowArchived] = useState(false);
  const lists = useQuery({ queryKey: ["households", selected?.id, "shopping-lists"], queryFn: () => listApi.lists(selected!.id), enabled: Boolean(selected) });
  const archived = useQuery({ queryKey: ["households", selected?.id, "shopping-lists", "archived"], queryFn: () => listApi.lists(selected!.id, true), enabled: Boolean(selected && showArchived) });
  const activeLists = lists.data ?? [];
  const activeTrips = useQueries({ queries: activeLists.map((list) => ({ queryKey: ["households", selected?.id, "shopping-lists", list.id, "active-trip"], queryFn: () => tripApi.active(selected!.id, list.id), enabled: Boolean(selected) })) });
  const tripFor = (index: number): ShoppingTrip | null => activeTrips[index]?.data ?? null;
  const refresh = () => void Promise.all([lists.refetch(), showArchived ? archived.refetch() : Promise.resolve()]);
  return (
    <AppScreen contentStyle={styles.content} refreshControl={<RefreshControl refreshing={lists.isRefetching} onRefresh={refresh} />}>
      <AppTopBar initials={user?.display_name || user?.email || "U"} onNotifications={() => router.push("/substitutions")} onProfile={() => router.push("/profile")} />
      <AppHeader title="Shopping Lists" subtitle="Plan what your household needs." right={<IconButton icon="plus" label="Create a new shopping list" onPress={() => router.push("/lists/new")} />} />
      {lists.isLoading ? <LoadingState rows={3} /> : lists.isError ? <InlineError onRetry={() => void lists.refetch()} /> : activeLists.length === 0 ? (
        <EmptyState icon="list" title="No shopping lists yet" body="Create your first list and start adding what the household needs." action={<Text accessibilityRole="button" onPress={() => router.push("/lists/new")} style={styles.emptyAction}>Create shopping list</Text>} />
      ) : (
        <><SectionHeader title="Active" /><View style={styles.cards}>{activeLists.map((list, index) => <ShoppingListCard key={list.id} activeTrip={tripFor(index)} list={list} onContinue={() => { const trip = tripFor(index); if (trip) router.push(`/trip/${trip.id}`); }} onOpen={() => router.push(`/lists/${list.id}`)} />)}</View></>
      )}
      <SectionHeader actionLabel={showArchived ? "Hide" : "Show"} onAction={() => setShowArchived((value) => !value)} title="Archived" />
      {showArchived ? archived.isLoading ? <LoadingState rows={2} /> : archived.isError ? <InlineError onRetry={() => void archived.refetch()} /> : archived.data?.length ? <View style={styles.cards}>{archived.data.map((list) => <ShoppingListCard archived key={list.id} list={list} onOpen={() => router.push(`/lists/${list.id}`)} />)}</View> : <EmptyArchived /> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({ content: { paddingBottom: spacing.huge }, cards: { gap: spacing.md }, emptyAction: { ...typography.bodyStrong, color: colors.primary, paddingVertical: spacing.md } });
