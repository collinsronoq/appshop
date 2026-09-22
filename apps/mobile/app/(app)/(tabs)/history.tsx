import Feather from "@expo/vector-icons/Feather";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppHeader, AppScreen, EmptyState, InlineError, LoadingState, SurfaceCard } from "../../../src/design/components";
import { colors, iconSizes, radius, spacing, typography } from "../../../src/design/theme";
import { useHouseholds } from "../../../src/households/household-context";
import { purchasesApi } from "../../../src/purchases/api-client";
import { PurchaseRow } from "../../../src/purchases/purchase-components";
export default function HistoryScreen() {
  const router = useRouter();
  const { selected } = useHouseholds();
  const q = useQuery({ queryKey: ["households", selected?.id, "purchases", "preview"], queryFn: () => purchasesApi.list(selected!.id, 0), enabled: Boolean(selected) });
  return <AppScreen><AppHeader title="History" subtitle="Keep track of what your household buys." />{q.isLoading ? <LoadingState rows={3} /> : q.isError ? <InlineError onRetry={() => void q.refetch()} /> : <>
    {q.data?.length ? <><Text style={styles.recent}>Recent purchases</Text>{q.data.slice(0, 3).map(item => <PurchaseRow key={item.id} purchase={item} onPress={item.household_product_id ? () => router.push(`/products/${item.household_product_id}`) : undefined} />)}<Pressable accessibilityRole="button" onPress={() => router.push("/purchases")} style={styles.moreLink}><Text style={styles.moreLinkText}>View all purchases</Text><Feather color={colors.primary} name="arrow-right" size={iconSizes.sm} /></Pressable></> : <><EmptyState icon="clock" title="No purchase activity yet" body="Complete a shopping trip to start building your household history." /><Pressable accessibilityRole="button" onPress={() => router.push("/purchases")} style={styles.moreLink}><Text style={styles.moreLinkText}>View all purchases</Text><Feather color={colors.primary} name="arrow-right" size={iconSizes.sm} /></Pressable></>}
    <Text style={styles.explore}>Explore</Text>
    <Pressable accessibilityRole="button" onPress={() => router.push("/purchasing-memory")}><SurfaceCard style={styles.compactCard}><View style={styles.icon}><Feather color={colors.primary} name="repeat" size={iconSizes.md} /></View><View style={styles.copy}><Text style={styles.title}>Buy Again</Text><Text style={styles.meta}>Recent and frequent products</Text></View><Feather color={colors.textSecondary} name="chevron-right" size={iconSizes.md} /></SurfaceCard></Pressable>
  </>}</AppScreen>;
}
const styles = StyleSheet.create({ compactCard: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm, paddingVertical: spacing.md }, icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center" }, copy: { flex: 1 }, title: { ...typography.bodyStrong, color: colors.text }, body: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs }, meta: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs }, recent: { ...typography.sectionTitle, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm }, explore: { ...typography.sectionTitle, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm }, moreLink: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginBottom: spacing.sm }, moreLinkText: { ...typography.bodyStrong, color: colors.primary } });
