import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SurfaceCard } from "../design/components";
import { formatQuantity, formatSize } from "../design/format";
import { colors, radius, spacing, typography } from "../design/theme";
import type { Purchase } from "./api-client";

export function dateLabel(value: string) { const date = new Date(value); const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const diff = Math.round((start.getTime() - day.getTime()) / 86_400_000); if (diff === 0) return "Today"; if (diff === 1) return "Yesterday"; return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }

export function PurchaseRow({ purchase, onPress }: { purchase: Purchase; onPress?: () => void }) {
  const meta = [purchase.purchased_brand_snapshot, purchase.purchased_variant_snapshot, formatSize(purchase.purchased_size_value_snapshot, purchase.purchased_size_unit_snapshot)].filter(Boolean).join(" · ");
  const details = [meta, `Qty ${formatQuantity(purchase.purchased_quantity)}`].filter(Boolean).join(" · ");
  const time = new Date(purchase.purchased_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const content = <SurfaceCard style={styles.row}><View style={styles.icon}><Feather color={colors.primary} name="shopping-bag" size={17} /></View><View style={styles.copy}><Text numberOfLines={1} style={styles.name}>{purchase.purchased_name_snapshot}</Text><Text numberOfLines={2} style={styles.meta}>{details} · {time}</Text>{purchase.substituted ? <Text numberOfLines={2} style={styles.substituted}>Substituted · Requested {purchase.requested_name_snapshot}</Text> : null}</View>{onPress ? <Feather color={colors.textSecondary} name="chevron-right" size={20} /> : null}</SurfaceCard>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{content}</Pressable> : content;
}

export function MemoryProductCard({ item, frequent, onBuy, onOpen }: { item: { household_product_id: string; name: string; brand?: string | null; size_value?: number | null; size_unit?: string | null; usual_quantity: number; last_purchased_at: string; purchase_count: number; archived: boolean }; frequent?: boolean; onBuy: () => void; onOpen: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onOpen}><SurfaceCard style={styles.memory}><View style={styles.memoryTop}><Text numberOfLines={1} style={styles.name}>{item.name}</Text>{item.archived ? <Text style={styles.archived}>Archived</Text> : <Pressable accessibilityRole="button" onPress={(event) => { event.stopPropagation(); onBuy(); }} style={styles.buy}><Text style={styles.buyText}>Buy Again</Text></Pressable>}</View><Text numberOfLines={1} style={styles.meta}>{[item.brand, formatSize(item.size_value, item.size_unit)].filter(Boolean).join(" · ") || "Saved household product"}</Text><Text numberOfLines={2} style={styles.meta}>{frequent ? `Bought ${formatQuantity(item.purchase_count)} times` : `Last bought ${dateLabel(item.last_purchased_at).toLowerCase()}`} · Usually buy {formatQuantity(item.usual_quantity)}</Text></SurfaceCard></Pressable>;
}

const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm, padding: spacing.md }, icon: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center" }, copy: { flex: 1, minWidth: 0 }, name: { ...typography.cardTitle, color: colors.text, flex: 1 }, meta: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 }, substituted: { ...typography.caption, color: colors.warning, marginTop: spacing.xs }, memory: { marginBottom: spacing.sm, padding: spacing.md }, memoryTop: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: spacing.sm }, buy: { minHeight: 36, justifyContent: "center", backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md }, buyText: { ...typography.caption, color: colors.surface, fontWeight: "800" }, archived: { ...typography.caption, color: colors.warning, backgroundColor: colors.warningSurface, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.round } });
