import Feather from "@expo/vector-icons/Feather";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth/auth-context";
import { AppScreen, BackHeader, Badge, InlineError, LoadingState, PrimaryButton, SecondaryButton, SurfaceCard, TertiaryButton } from "../design/components";
import { formatQuantity, formatSize } from "../design/format";
import { colors, radius, spacing, typography } from "../design/theme";
import { useHouseholds } from "../households/household-context";
import { listApi } from "../lists/api-client";
import type { ShoppingListItem } from "../lists/types";
import { pushNotificationApi } from "../notifications/api-client";
import type { SubstitutionRequest } from "../notifications/types";
import { productApi } from "../products/api-client";
import { ProductArtwork } from "../products/product-images";
import type { HouseholdProduct } from "../products/types";
import { useShoppingListRealtime } from "../realtime/use-shopping-list-realtime";
import { tripApi } from "../trips/api-client";
import type { TripItem } from "../trips/types";

export function canCompleteTrip(items: TripItem[]) {
  return items.every((item) => item.status !== "pending");
}

function startedLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `Started ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function SubstitutionCallout({ request, isRequester, onOpen }: { request: SubstitutionRequest; isRequester: boolean; onOpen: () => void }) {
  const pending = request.status === "pending";
  const statusLabel = pending ? (isRequester ? "Waiting for approval" : "Approval needed") : request.status === "approved" ? "Approved" : request.status === "rejected" ? "Rejected" : "Cancelled";
  const tone = request.status === "approved" ? "success" : request.status === "rejected" ? "error" : "warning";
  return (
    <Pressable accessibilityLabel={`Open replacement request for ${request.proposed_name}`} accessibilityRole="button" onPress={onOpen}>
      <View style={styles.substitutionCallout}>
        <View style={styles.substitutionIcon}><Feather color={colors.warning} name="repeat" size={16} /></View>
        <View style={styles.substitutionCopy}>
          <View style={styles.substitutionHeading}><Text style={styles.substitutionTitle}>Proposed replacement</Text><Badge label={statusLabel} tone={tone} /></View>
          <Text style={styles.substitutionName}>{request.proposed_name}</Text>
          <Text style={styles.reviewText}>{pending ? "Review request" : "View decision"} →</Text>
        </View>
      </View>
    </Pressable>
  );
}

type TripItemRowProps = {
  item: TripItem; source?: ShoppingListItem; product?: HouseholdProduct; substitution?: SubstitutionRequest;
  isRequester: boolean; compactLayout: boolean; busy: boolean; onCollect: () => void; onSkip: () => void; onUndo: () => void;
  onUnavailable: () => void; onOpenSubstitution: () => void;
};

function TripItemRow({ item, source, product, substitution, isRequester, compactLayout, busy, onCollect, onSkip, onUndo, onUnavailable, onOpenSubstitution }: TripItemRowProps) {
  const collected = item.status === "collected";
  const skipped = item.status === "skipped";
  const details = [item.brand, item.variant, formatSize(item.size_value, item.size_unit)].filter(Boolean).join(" · ");
  const categorySlug = product?.category?.slug ?? source?.category?.slug ?? source?.category_slug;
  const imageUrl = product?.image_url ?? source?.image_url;
  return (
    <SurfaceCard accessibilityLabel={`${item.name}, ${item.status}`} style={[styles.itemCard, collected ? styles.collectedCard : null, skipped ? styles.skippedCard : null]}>
      <View style={styles.itemTop}>
        <View style={styles.itemImage}>
          <ProductArtwork categorySlug={categorySlug} imageUrl={imageUrl} name={item.name} />
          {collected ? <View style={styles.imageStatus}><Feather color={colors.surface} name="check" size={14} /></View> : null}
        </View>
        <View style={styles.itemCopy}>
          <Text style={[styles.itemName, skipped ? styles.skippedName : null]}>{item.name}</Text>
          {details ? <Text style={styles.meta}>{details}</Text> : null}
          {item.notes ? <Text style={styles.note}>Note: {item.notes}</Text> : null}
          {compactLayout ? <View style={styles.inlineQuantity}><Badge label={`Qty ${formatQuantity(item.requested_quantity)}`} /></View> : null}
        </View>
        {!compactLayout ? <Badge label={`Qty ${formatQuantity(item.requested_quantity)}`} /> : null}
      </View>
      {substitution ? <SubstitutionCallout isRequester={isRequester} onOpen={onOpenSubstitution} request={substitution} /> : null}
      {collected || skipped ? (
        <View style={styles.resolvedRow}><Badge label={collected ? "Collected" : "Skipped"} tone={collected ? "success" : "warning"} /><SecondaryButton compact disabled={busy} fullWidth={false} icon="rotate-ccw" label="Undo" loading={busy} onPress={onUndo} /></View>
      ) : (
        <View style={styles.itemActions}>
          <View style={[styles.primaryActions, compactLayout ? styles.primaryActionsStacked : null]}>
            <PrimaryButton compact icon="check" label="Mark collected" loading={busy} onPress={onCollect} style={compactLayout ? undefined : styles.flexAction} />
            <SecondaryButton compact disabled={busy} fullWidth={compactLayout} icon="help-circle" label="Unavailable" onPress={onUnavailable} style={compactLayout ? undefined : styles.flexAction} />
          </View>
          <TertiaryButton icon="minus-circle" label="Skip item" onPress={onSkip} style={styles.skipAction} />
        </View>
      )}
    </SurfaceCard>
  );
}

export function ShoppingModeScreen({ tripId, substitutionId }: { tripId: string; substitutionId?: string }) {
  const { user } = useAuth();
  const { selected } = useHouseholds();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const compactLayout = width <= 390 || fontScale >= 1.2;
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [tripAction, setTripAction] = useState<"complete" | "cancel" | null>(null);
  const [tripActionError, setTripActionError] = useState<string | null>(null);

  const tripQuery = useQuery({ queryKey: ["households", selected?.id, "trips", tripId], queryFn: () => tripApi.get(selected!.id, tripId), enabled: Boolean(selected && tripId) });
  const trip = tripQuery.data;
  const listQuery = useQuery({ queryKey: ["households", selected?.id, "shopping-lists", trip?.shopping_list_id], queryFn: () => listApi.get(selected!.id, trip!.shopping_list_id), enabled: Boolean(selected && trip?.shopping_list_id) });
  const pendingSubstitutions = useQuery({ queryKey: ["households", selected?.id, "substitutions", "pending"], queryFn: () => pushNotificationApi.listPendingSubstitutions(selected!.id), enabled: Boolean(selected), retry: false });
  const linkedSubstitution = useQuery({ queryKey: ["households", selected?.id, "substitutions", substitutionId], queryFn: () => pushNotificationApi.getSubstitution(selected!.id, substitutionId!), enabled: Boolean(selected && substitutionId), retry: false });
  useShoppingListRealtime(selected?.id, trip?.shopping_list_id, tripId);

  const sourceItems = listQuery.data?.items ?? [];
  const productIds = Array.from(new Set(sourceItems.map((item) => item.household_product_id).filter((id): id is string => Boolean(id))));
  const productQueries = useQueries({ queries: productIds.map((productId) => ({ queryKey: ["households", selected?.id, "products", productId], queryFn: () => productApi.get(selected!.id, productId), enabled: Boolean(selected), staleTime: 60_000 })) });
  const products = new Map<string, HouseholdProduct>();
  productQueries.forEach((query, index) => { if (query.data) products.set(productIds[index]!, query.data); });
  const sources = new Map(sourceItems.map((item) => [item.id, item]));
  const substitutions = new Map<string, SubstitutionRequest>();
  (pendingSubstitutions.data ?? []).filter((request) => request.shopping_trip_id === tripId).forEach((request) => substitutions.set(request.trip_item_id, request));
  if (linkedSubstitution.data?.shopping_trip_id === tripId) substitutions.set(linkedSubstitution.data.trip_item_id, linkedSubstitution.data);

  const act = async (item: TripItem, action: () => Promise<unknown>) => {
    if (!selected) return;
    setBusyItem(item.id);
    try { await action(); await queryClient.invalidateQueries({ queryKey: ["households", selected.id, "trips", tripId] }); }
    catch { Alert.alert("Couldn’t update item", "Check your connection and try again."); }
    finally { setBusyItem(null); }
  };

  if (tripQuery.isLoading) return <AppScreen><LoadingState rows={6} /></AppScreen>;
  if (tripQuery.isError || !trip) return <AppScreen><InlineError message="Couldn’t load this shopping trip." onRetry={() => void tripQuery.refetch()} /><SecondaryButton label="Back to lists" onPress={() => router.back()} /></AppScreen>;

  const ready = canCompleteTrip(trip.items);
  const progressPercent = Math.round((trip.progress.total ? trip.progress.collected / trip.progress.total : 0) * 100);
  const pendingCount = trip.items.filter((item) => item.status === "pending").length;
  const skippedCount = trip.items.filter((item) => item.status === "skipped").length;

  const finishTrip = async () => {
    if (!selected || !ready) return;
    setTripAction("complete"); setTripActionError(null);
    try { await tripApi.complete(selected.id, trip.id); await queryClient.invalidateQueries(); router.replace("/(app)/(tabs)/lists"); }
    catch (error) { setTripActionError(error instanceof Error ? error.message : "The trip could not be completed. Refresh and try again."); await tripQuery.refetch(); }
    finally { setTripAction(null); }
  };
  const confirmFinish = () => Alert.alert("Complete this shopping trip?", "Completed trips cannot be reopened.", [{ text: "Keep shopping", style: "cancel" }, { text: "Complete", onPress: () => void finishTrip() }]);
  const cancelTrip = async () => {
    if (!selected) return;
    setTripAction("cancel"); setTripActionError(null);
    try { await tripApi.cancel(selected.id, trip.id); await queryClient.invalidateQueries(); router.back(); }
    catch (error) { setTripActionError(error instanceof Error ? error.message : "The trip could not be cancelled. Try again."); }
    finally { setTripAction(null); }
  };
  const confirmCancel = () => Alert.alert("Cancel this shopping trip?", "Collected progress will remain in trip history.", [{ text: "Keep shopping", style: "cancel" }, { text: "Cancel trip", style: "destructive", onPress: () => void cancelTrip() }]);

  return (
    <AppScreen contentStyle={[styles.screenContent, { paddingBottom: Math.max(spacing.huge, insets.bottom + spacing.xxl) }]} testID="shopping-mode-screen">
      <BackHeader onBack={() => router.back()} right={<SecondaryButton compact disabled={tripAction !== null} fullWidth={false} label="Cancel trip" loading={tripAction === "cancel"} onPress={confirmCancel} />} title={listQuery.data?.name ?? "Shopping trip"} />
      <SurfaceCard style={styles.tripHeader}>
        <View style={styles.tripTitleRow}>
          <View style={styles.tripIcon}><Feather color={colors.primary} name="shopping-cart" size={20} /></View>
          <View style={styles.tripCopy}><Text style={styles.tripTitle}>{listQuery.data?.name ?? "Shopping trip"}</Text><Text style={styles.tripMeta}>{[trip.store_name, startedLabel(trip.started_at)].filter(Boolean).join(" · ") || "Active shopping trip"}</Text></View>
          <Badge label="Active trip" tone="success" />
        </View>
        <View style={styles.progressLine}><Text style={styles.progressText}>{trip.progress.collected} of {trip.progress.total} collected</Text><Text style={styles.percent}>{progressPercent}%</Text></View>
        <View accessibilityLabel={`${progressPercent} percent collected`} accessibilityRole="progressbar" style={styles.track}><View style={[styles.fill, { width: `${progressPercent}%` }]} /></View>
        <Text style={styles.remaining}>{pendingCount} remaining{skippedCount ? ` · ${skippedCount} skipped` : ""}</Text>
      </SurfaceCard>
      {linkedSubstitution.isError ? <InlineError message="This replacement request is no longer available." onRetry={() => void linkedSubstitution.refetch()} /> : null}
      {pendingSubstitutions.isError ? <InlineError message="Couldn’t load replacement requests." onRetry={() => void pendingSubstitutions.refetch()} /> : null}
      <View style={styles.sectionHeading}><Text style={styles.heading}>Trip items</Text><Text style={styles.itemCount}>{trip.items.length} item{trip.items.length === 1 ? "" : "s"}</Text></View>
      {trip.items.length ? trip.items.map((item) => {
        const source = sources.get(item.shopping_list_item_id);
        const product = source?.household_product_id ? products.get(source.household_product_id) : undefined;
        const substitution = substitutions.get(item.id);
        return <TripItemRow busy={busyItem === item.id} compactLayout={compactLayout} isRequester={substitution?.requested_by_user_id === user?.id} item={item} key={item.id} onCollect={() => void act(item, () => tripApi.collect(selected!.id, trip.id, item.id))} onOpenSubstitution={() => substitution && router.push(`/substitutions/${substitution.id}`)} onSkip={() => void act(item, () => tripApi.skip(selected!.id, trip.id, item.id))} onUnavailable={() => router.push((`/trip/${trip.id}/items/${item.id}/unavailable`) as never)} onUndo={() => void act(item, () => tripApi.undo(selected!.id, trip.id, item.id))} product={product} source={source} substitution={substitution} />;
      }) : <SurfaceCard><Text style={styles.itemName}>No trip items</Text><Text style={styles.meta}>This trip has no items to collect.</Text></SurfaceCard>}
      <SurfaceCard style={styles.finishCard}>
        <View><Text style={styles.finishTitle}>{ready ? "Ready to finish" : `${pendingCount} item${pendingCount === 1 ? "" : "s"} still ${pendingCount === 1 ? "needs" : "need"} attention`}</Text><Text style={styles.meta}>{ready ? "Every item is collected or skipped." : "Collect or skip every pending item before completing the trip."}</Text></View>
        {tripActionError ? <InlineError message={tripActionError} onRetry={() => { setTripActionError(null); void tripQuery.refetch(); }} /> : null}
        <PrimaryButton disabled={!ready || tripAction !== null} icon="check-circle" label={ready ? "Complete trip" : `Resolve ${pendingCount} to finish`} loading={tripAction === "complete"} onPress={confirmFinish} />
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingTop: spacing.sm }, tripHeader: { gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  tripTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, tripIcon: { width: 38, height: 38, borderRadius: radius.round, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySubtle },
  tripCopy: { flex: 1, minWidth: 0 }, tripTitle: { ...typography.h3, color: colors.text }, tripMeta: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xxs },
  progressLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xs }, progressText: { ...typography.bodyStrong, color: colors.text }, percent: { ...typography.secondary, color: colors.primary, fontWeight: "800" },
  track: { height: 8, borderRadius: radius.round, overflow: "hidden", backgroundColor: colors.primarySubtle }, fill: { height: "100%", borderRadius: radius.round, backgroundColor: colors.success }, remaining: { ...typography.secondary, color: colors.textSecondary },
  sectionHeading: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.sm }, heading: { ...typography.sectionTitle, color: colors.text }, itemCount: { ...typography.secondary, color: colors.textSecondary },
  itemCard: { gap: spacing.sm, marginBottom: spacing.sm, padding: spacing.md }, collectedCard: { backgroundColor: colors.successLight, borderColor: colors.primaryBorder }, skippedCard: { backgroundColor: colors.warningLight },
  itemTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }, itemImage: { width: 52, height: 52, overflow: "hidden", borderRadius: radius.md }, imageStatus: { position: "absolute", right: 3, bottom: 3, width: 20, height: 20, borderRadius: radius.round, alignItems: "center", justifyContent: "center", backgroundColor: colors.success },
  itemCopy: { flex: 1, minWidth: 0 }, itemName: { ...typography.cardTitle, color: colors.text }, skippedName: { color: colors.textSecondary, textDecorationLine: "line-through" }, meta: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xxs }, note: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  inlineQuantity: { alignSelf: "flex-start", marginTop: spacing.xs }, itemActions: { gap: spacing.xxs }, primaryActions: { flexDirection: "row", alignItems: "stretch", gap: spacing.sm }, primaryActionsStacked: { flexDirection: "column" }, flexAction: { flex: 1, minWidth: 0 }, skipAction: { alignSelf: "flex-start", paddingHorizontal: 0 }, resolvedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  substitutionCallout: { flexDirection: "row", gap: spacing.sm, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.warningSurface, borderWidth: 1, borderColor: colors.warningLight }, substitutionIcon: { width: 30, height: 30, borderRadius: radius.round, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }, substitutionCopy: { flex: 1, minWidth: 0 }, substitutionHeading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.xs }, substitutionTitle: { ...typography.caption, color: colors.warning, textTransform: "uppercase" }, substitutionName: { ...typography.bodyStrong, color: colors.text, marginTop: spacing.xxs }, reviewText: { ...typography.secondary, color: colors.primary, fontWeight: "700", marginTop: spacing.xs },
  finishCard: { gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.md, backgroundColor: colors.primarySubtle }, finishTitle: { ...typography.h3, color: colors.text }
});
