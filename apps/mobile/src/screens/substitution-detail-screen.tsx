import Feather from "@expo/vector-icons/Feather";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth/auth-context";
import { AppScreen, BackHeader, Badge, DestructiveButton, InlineError, LoadingState, PrimaryButton, SecondaryButton, SurfaceCard } from "../design/components";
import { formatQuantity, formatSize } from "../design/format";
import { colors, radius, spacing, typography } from "../design/theme";
import { useHouseholds } from "../households/household-context";
import { listApi } from "../lists/api-client";
import { pushNotificationApi } from "../notifications/api-client";
import type { SubstitutionRequest } from "../notifications/types";
import { productApi } from "../products/api-client";
import { ProductArtwork } from "../products/product-images";
import { tripApi } from "../trips/api-client";

function ProductComparisonCard({
  eyebrow,
  name,
  details,
  quantity,
  note,
  imageUrl,
  categorySlug,
  tone
}: {
  eyebrow: string;
  name: string;
  details?: string;
  quantity?: number;
  note?: string | null;
  imageUrl?: string | null;
  categorySlug?: string | null;
  tone: "requested" | "proposed";
}) {
  return (
    <View style={[styles.comparisonCard, tone === "proposed" ? styles.proposedCard : styles.requestedCard]}>
      <View style={styles.comparisonEyebrow}><Feather color={tone === "proposed" ? colors.success : colors.danger} name={tone === "proposed" ? "check-circle" : "x-circle"} size={14} /><Text style={[styles.eyebrow, tone === "proposed" ? styles.proposedEyebrow : styles.requestedEyebrow]}>{eyebrow}</Text></View>
      <View style={styles.productImage}><ProductArtwork categorySlug={categorySlug} imageUrl={imageUrl} name={name} /></View>
      <Text style={styles.productName}>{name}</Text>
      {details ? <Text style={styles.productMeta}>{details}</Text> : null}
      {quantity !== undefined ? <Badge label={`Qty ${formatQuantity(quantity)}`} tone={tone === "proposed" ? "success" : "neutral"} /> : null}
      {note ? <Text style={styles.productNote}>Note: {note}</Text> : null}
    </View>
  );
}

function stateCopy(request: SubstitutionRequest, isRequester: boolean) {
  if (request.status === "approved") return { title: "Replacement approved", body: "The replacement has been applied to the trip item. It still needs to be marked collected by the shopper.", tone: "success" as const, icon: "check-circle" as const };
  if (request.status === "rejected") return { title: "Replacement rejected", body: "The original trip item remains pending until the shopper collects it or skips it.", tone: "error" as const, icon: "x-circle" as const };
  if (request.status === "cancelled") return { title: "Request cancelled", body: "No replacement was applied. The trip item keeps its existing state.", tone: "neutral" as const, icon: "slash" as const };
  if (isRequester) return { title: "Waiting for another household member", body: "You proposed this replacement, so someone else must approve it. You may reject the proposal if it is no longer suitable.", tone: "warning" as const, icon: "clock" as const };
  return { title: "Your decision is needed", body: "Approving applies this replacement to the trip item. It does not mark the item collected.", tone: "warning" as const, icon: "clock" as const };
}

export function SubstitutionDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { selected } = useHouseholds();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const detailKey = ["households", selected?.id, "substitutions", id];
  const requestQuery = useQuery({ queryKey: detailKey, queryFn: () => pushNotificationApi.getSubstitution(selected!.id, id), enabled: Boolean(selected && id), retry: false });
  const request = requestQuery.data;
  const tripQuery = useQuery({ queryKey: ["households", selected?.id, "trips", request?.shopping_trip_id], queryFn: () => tripApi.get(selected!.id, request!.shopping_trip_id), enabled: Boolean(selected && request?.shopping_trip_id), retry: false });
  const original = tripQuery.data?.items.find((entry) => entry.id === request?.trip_item_id);
  const listQuery = useQuery({ queryKey: ["households", selected?.id, "shopping-lists", tripQuery.data?.shopping_list_id], queryFn: () => listApi.get(selected!.id, tripQuery.data!.shopping_list_id), enabled: Boolean(selected && tripQuery.data?.shopping_list_id), retry: false });
  const source = listQuery.data?.items?.find((entry) => entry.id === original?.shopping_list_item_id);
  const requestedProduct = useQuery({ queryKey: ["households", selected?.id, "products", source?.household_product_id], queryFn: () => productApi.get(selected!.id, source!.household_product_id!), enabled: Boolean(selected && source?.household_product_id), retry: false });
  const proposedProduct = useQuery({ queryKey: ["households", selected?.id, "products", request?.proposed_product_id], queryFn: () => productApi.get(selected!.id, request!.proposed_product_id!), enabled: Boolean(selected && request?.proposed_product_id), retry: false });
  const decision = useMutation({
    mutationFn: (value: "approve" | "reject") => pushNotificationApi.decide(selected!.id, id, value),
    onSuccess: async (updated) => {
      queryClient.setQueryData(detailKey, updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["households", selected!.id, "substitutions", "pending"] }),
        queryClient.invalidateQueries({ queryKey: ["households", selected!.id, "trips", updated.shopping_trip_id] })
      ]);
    },
    onError: () => { void requestQuery.refetch(); }
  });

  if (requestQuery.isLoading) return <AppScreen><LoadingState rows={5} /></AppScreen>;
  if (requestQuery.isError || !request) return <AppScreen><InlineError message="Couldn’t load this replacement request." onRetry={() => void requestQuery.refetch()} /><SecondaryButton label="Back" onPress={() => router.back()} /></AppScreen>;

  const isRequester = request.requested_by_user_id === user?.id;
  const canApprove = request.status === "pending" && !isRequester;
  const canReject = request.status === "pending";
  const status = stateCopy(request, isRequester);
  const proposedDetails = [request.proposed_brand, request.proposed_variant, formatSize(request.proposed_size_value, request.proposed_size_unit)].filter(Boolean).join(" · ");
  const requestedDetails = original ? [original.brand, original.variant, formatSize(original.size_value, original.size_unit)].filter(Boolean).join(" · ") : undefined;
  const stackComparison = width < 360 || fontScale >= 1.15;

  return (
    <AppScreen contentStyle={{ paddingBottom: Math.max(spacing.huge, insets.bottom + spacing.xxl) }} testID="substitution-detail-screen">
      <BackHeader onBack={() => router.back()} title="Replacement request" />
      <View style={styles.titleRow}><View style={styles.titleCopy}><Text style={styles.title}>Compare replacement</Text><Text style={styles.subtitle}>Review the requested item and the proposed product.</Text></View><Badge label={request.status[0]!.toUpperCase() + request.status.slice(1)} tone={status.tone} /></View>

      {tripQuery.isLoading ? <LoadingState rows={2} /> : tripQuery.isError || !original ? <InlineError message="Couldn’t load the original trip item." onRetry={() => void tripQuery.refetch()} /> : (
        <View style={[styles.comparison, stackComparison ? styles.comparisonStacked : null]}>
          <ProductComparisonCard categorySlug={requestedProduct.data?.category?.slug ?? source?.category?.slug ?? source?.category_slug} details={requestedDetails} eyebrow="Requested" imageUrl={requestedProduct.data?.image_url ?? source?.image_url} name={original.name} note={original.notes} quantity={original.requested_quantity} tone="requested" />
          <View style={styles.arrow}><Feather color={colors.primary} name={stackComparison ? "arrow-down" : "arrow-right"} size={18} /></View>
          <ProductComparisonCard categorySlug={proposedProduct.data?.category?.slug} details={proposedDetails || undefined} eyebrow="Proposed" imageUrl={proposedProduct.data?.image_url} name={request.proposed_name} quantity={original.requested_quantity} tone="proposed" />
        </View>
      )}

      <SurfaceCard style={[styles.stateCard, status.tone === "success" ? styles.successCard : status.tone === "error" ? styles.errorCard : styles.waitingCard]}>
        <View style={styles.stateIcon}><Feather color={status.tone === "success" ? colors.success : status.tone === "error" ? colors.danger : colors.warning} name={status.icon} size={20} /></View>
        <View style={styles.stateCopy}><Text style={styles.stateTitle}>{status.title}</Text><Text style={styles.stateBody}>{status.body}</Text></View>
      </SurfaceCard>

      {decision.isError ? <InlineError message={decision.error instanceof Error ? decision.error.message : "The decision could not be saved. Refresh and try again."} onRetry={() => { decision.reset(); void requestQuery.refetch(); }} /> : null}
      {canApprove || canReject ? (
        <View style={styles.actions}>
          {canApprove ? <PrimaryButton disabled={decision.isPending} icon="check-circle" label="Approve replacement" loading={decision.isPending && decision.variables === "approve"} onPress={() => decision.mutate("approve")} /> : null}
          {canReject ? <DestructiveButton disabled={decision.isPending} icon="x-circle" label="Reject replacement" loading={decision.isPending && decision.variables === "reject"} onPress={() => decision.mutate("reject")} /> : null}
        </View>
      ) : <SecondaryButton label="Back to shopping" onPress={() => router.push(`/trip/${request.shopping_trip_id}`)} />}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.lg }, titleCopy: { flex: 1, minWidth: 0 }, title: { ...typography.h2, color: colors.text }, subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  comparison: { flexDirection: "row", alignItems: "stretch", gap: spacing.xs }, comparisonStacked: { flexDirection: "column" }, comparisonCard: { flex: 1, minWidth: 0, gap: spacing.xs, padding: spacing.sm, borderWidth: 1, borderRadius: radius.md }, requestedCard: { backgroundColor: colors.dangerSurface, borderColor: colors.errorLight }, proposedCard: { backgroundColor: colors.successLight, borderColor: colors.primaryBorder },
  comparisonEyebrow: { flexDirection: "row", alignItems: "center", gap: spacing.xxs }, eyebrow: { ...typography.overline }, requestedEyebrow: { color: colors.danger }, proposedEyebrow: { color: colors.success }, productImage: { width: "100%", aspectRatio: 1.7, overflow: "hidden", borderRadius: radius.sm, backgroundColor: colors.surface }, productName: { ...typography.cardTitle, color: colors.text }, productMeta: { ...typography.secondary, color: colors.textSecondary }, productNote: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xxs },
  arrow: { width: 28, minHeight: 28, alignSelf: "center", alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: colors.primarySubtle },
  stateCard: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.lg }, successCard: { backgroundColor: colors.successLight }, errorCard: { backgroundColor: colors.dangerSurface }, waitingCard: { backgroundColor: colors.warningSurface }, stateIcon: { width: 36, height: 36, borderRadius: radius.round, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }, stateCopy: { flex: 1, minWidth: 0 }, stateTitle: { ...typography.bodyStrong, color: colors.text }, stateBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs }, actions: { gap: spacing.sm, marginTop: spacing.lg }
});
