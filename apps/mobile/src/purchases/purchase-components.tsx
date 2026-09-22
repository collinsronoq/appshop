import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SurfaceCard } from "../design/components";
import { formatQuantity, formatSize } from "../design/format";
import { colors, radius, spacing, typography } from "../design/theme";
import { ProductArtwork } from "../products/product-images";
import type { Purchase } from "./api-client";

export function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((start.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

export function purchaseCountLabel(count: number) {
  return count === 1 ? "Bought once" : `Bought ${formatQuantity(count)} times`;
}

export function PurchaseRow({ purchase, onPress }: { purchase: Purchase; onPress?: () => void }) {
  const meta = [purchase.purchased_brand_snapshot, purchase.purchased_variant_snapshot, formatSize(purchase.purchased_size_value_snapshot, purchase.purchased_size_unit_snapshot)].filter(Boolean).join(" · ");
  const date = new Date(purchase.purchased_at);
  const time = Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const content = (
    <SurfaceCard style={styles.row}>
      <View style={styles.icon}><ProductArtwork name={purchase.purchased_name_snapshot} /></View>
      <View style={styles.copy}>
        <Text numberOfLines={2} style={styles.name}>{purchase.purchased_name_snapshot}</Text>
        {meta ? <Text numberOfLines={2} style={styles.meta}>{meta}</Text> : null}
        <Text style={styles.quantity}>Quantity {formatQuantity(purchase.purchased_quantity)}</Text>
        {purchase.substituted ? <Text numberOfLines={2} style={styles.substituted}>Substituted for {purchase.requested_name_snapshot}</Text> : null}
      </View>
      <View style={styles.trailing}>
        <Text style={styles.date}>{dateLabel(purchase.purchased_at)}</Text>
        {time ? <Text style={styles.time}>{time}</Text> : null}
        {onPress ? <Feather color={colors.textSecondary} name="chevron-right" size={20} /> : null}
      </View>
    </SurfaceCard>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{content}</Pressable> : content;
}

export function MemoryProductCard({ item, frequent, onBuy, onOpen }: { item: { household_product_id: string; name: string; brand?: string | null; size_value?: number | null; size_unit?: string | null; usual_quantity: number; last_purchased_at: string; purchase_count: number; archived: boolean }; frequent?: boolean; onBuy: () => void; onOpen: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onOpen}>
      <SurfaceCard style={styles.memory}>
        <View style={styles.memoryRow}>
          <View style={styles.memoryImage}><ProductArtwork name={item.name} /></View>
          <View style={styles.copy}>
            <View style={styles.memoryTop}>
              <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
              {item.archived ? <Text style={styles.archived}>Archived</Text> : <Pressable accessibilityRole="button" onPress={(event) => { event.stopPropagation(); onBuy(); }} style={styles.buy}><Text style={styles.buyText}>Buy Again</Text></Pressable>}
            </View>
            <Text numberOfLines={2} style={styles.meta}>{[item.brand, formatSize(item.size_value, item.size_unit)].filter(Boolean).join(" · ") || "Saved household product"}</Text>
            <Text numberOfLines={2} style={styles.meta}>{frequent ? purchaseCountLabel(item.purchase_count) : `Last bought ${dateLabel(item.last_purchased_at).toLowerCase()}`} · Usually buy {formatQuantity(item.usual_quantity)}</Text>
          </View>
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.sm, padding: spacing.md },
  icon: { width: 52, height: 52, overflow: "hidden", borderRadius: radius.md, backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  name: { ...typography.cardTitle, color: colors.text, flex: 1 },
  meta: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 },
  quantity: { ...typography.caption, color: colors.primary, fontFamily: "AppShopSansBold", marginTop: spacing.xs },
  substituted: { ...typography.caption, color: colors.warning, marginTop: spacing.xs },
  trailing: { minWidth: 64, alignItems: "flex-end", gap: 2 },
  date: { ...typography.caption, color: colors.text },
  time: { ...typography.caption, color: colors.textSecondary },
  memory: { marginBottom: spacing.sm, padding: spacing.md },
  memoryRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  memoryImage: { width: 64, height: 64, overflow: "hidden", borderRadius: radius.md },
  memoryTop: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  buy: { minHeight: 36, justifyContent: "center", backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md },
  buyText: { ...typography.caption, color: colors.surface, fontFamily: "AppShopSansBold" },
  archived: { ...typography.caption, color: colors.warning, backgroundColor: colors.warningSurface, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.round }
});
