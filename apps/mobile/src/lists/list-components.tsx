import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, iconSizes, radius, spacing, typography } from "../design/theme";
import { SurfaceCard } from "../design/components";
import { formatQuantity, formatSize } from "../design/format";
import type { ShoppingList, ShoppingListItem } from "./types";
import type { ShoppingTrip } from "../trips/types";
import { ListArtwork, ProductArtwork } from "../products/product-images";

export function formatUpdated(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updated recently";
  const elapsedMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (elapsedMinutes < 1) return "Updated just now";
  if (elapsedMinutes < 60) return `Updated ${elapsedMinutes} min ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Updated ${elapsedHours} hr${elapsedHours === 1 ? "" : "s"} ago`;
  if (elapsedHours < 48) return "Updated yesterday";
  return `Updated ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function ShoppingListCard({
  list,
  activeTrip,
  archived = false,
  onOpen,
  onContinue
}: {
  list: ShoppingList;
  activeTrip?: ShoppingTrip | null;
  archived?: boolean;
  onOpen: () => void;
  onContinue?: () => void;
}) {
  const progress = activeTrip && activeTrip.progress.total ? activeTrip.progress.collected / activeTrip.progress.total : 0;
  return (
    <SurfaceCard style={[styles.listCard, archived ? styles.archivedCard : null]}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [styles.cardPress, pressed ? styles.pressed : null]}>
        <View style={styles.cardHeader}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.listArtwork}><ListArtwork items={list.items} name={list.name} /></View>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={styles.listName}>{list.name}</Text>
            <Text style={styles.meta}>{list.item_count} item{list.item_count === 1 ? "" : "s"} · {formatUpdated(list.updated_at)}</Text>
          </View>
          <Feather color={colors.textSecondary} name="chevron-right" size={iconSizes.md} />
        </View>
        {activeTrip ? (
          <View style={styles.activeSummary}>
            <View style={styles.activeLabel}><Feather color={colors.success} name="shopping-cart" size={16} /><Text style={styles.activeText}>Shopping in progress</Text></View>
            <Text style={styles.meta}>{activeTrip.progress.collected} of {activeTrip.progress.total} collected</Text>
            <View accessibilityLabel={`${Math.round(progress * 100)} percent collected`} accessibilityRole="progressbar" style={styles.track}><View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} /></View>
          </View>
        ) : null}
      </Pressable>
      {activeTrip && onContinue ? <Pressable accessibilityRole="button" onPress={onContinue} style={({ pressed }) => [styles.continueButton, pressed ? styles.pressed : null]}><Text style={styles.continueText}>Continue</Text><Feather color={colors.surface} name="arrow-right" size={16} /></Pressable> : null}
    </SurfaceCard>
  );
}

export function ListItemRow({ item, onMenu }: { item: ShoppingListItem; onMenu: () => void }) {
  const metadata = [...[item.brand, item.variant, formatSize(item.size_value, item.size_unit)].filter(Boolean), `Qty ${formatQuantity(item.requested_quantity)}`].join(" · ");
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemIcon}>{item.household_product_id ? <ProductArtwork categorySlug={item.category_slug} imageUrl={item.image_url} name={item.name} /> : <Feather color={colors.primary} name="edit-3" size={18} />}</View>
      <View style={styles.flex}>
        <Text numberOfLines={2} style={styles.itemName}>{item.name}</Text>
        <Text numberOfLines={2} style={styles.meta}>{metadata}</Text>
        {item.notes ? <Text numberOfLines={2} style={styles.note}>{item.notes}</Text> : null}
      </View>
      <Pressable accessibilityLabel={`Actions for ${item.name}`} accessibilityRole="button" onPress={onMenu} style={styles.menuButton}><Feather color={colors.textSecondary} name="more-vertical" size={iconSizes.md} /></Pressable>
    </View>
  );
}

export function EmptyArchived() {
  return <Text style={styles.archivedEmpty}>Archived lists will appear here.</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.76 },
  listCard: { padding: spacing.md },
  archivedCard: { opacity: 0.78 },
  cardPress: { gap: spacing.sm },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  listArtwork: { width: 52, height: 52, overflow: "hidden", borderRadius: radius.md, backgroundColor: colors.primarySubtle },
  listName: { ...typography.cardTitle, color: colors.text, fontSize: 17 },
  meta: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  activeSummary: { backgroundColor: colors.primarySubtle, borderRadius: radius.md, padding: spacing.md },
  activeLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  activeText: { ...typography.secondary, color: colors.success, fontWeight: "800" },
  track: { height: 7, overflow: "hidden", backgroundColor: "#C6D5C9", borderRadius: radius.round, marginTop: spacing.sm },
  fill: { height: "100%", backgroundColor: colors.success, borderRadius: radius.round },
  continueButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, marginTop: spacing.md },
  continueText: { ...typography.bodyStrong, color: colors.surface },
  itemRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  itemIcon: { width: 44, height: 44, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center" },
  itemName: { ...typography.cardTitle, color: colors.text },
  note: { ...typography.secondary, color: colors.textSecondary, fontStyle: "italic", marginTop: spacing.xs },
  menuButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  archivedEmpty: { ...typography.secondary, color: colors.textSecondary, paddingVertical: spacing.md }
});
