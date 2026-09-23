import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, iconSizes, radius, spacing, typography } from "../design/theme";
import { Badge, PrimaryButton, SurfaceCard } from "../design/components";
import { formatQuantity, formatSize } from "../design/format";
import type { ShoppingList, ShoppingListItem } from "./types";
import type { ShoppingTrip } from "../trips/types";
import { ProductArtwork } from "../products/product-images";

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
          <View style={styles.flex}>
            <View style={styles.titleRow}>
              <Text numberOfLines={2} style={styles.listName}>{list.name}</Text>
              <Badge label={activeTrip ? "In progress" : archived ? "Archived" : "Active"} tone={activeTrip ? "success" : "neutral"} />
            </View>
            <Text style={styles.meta}>{list.item_count} item{list.item_count === 1 ? "" : "s"}</Text>
          </View>
          <Feather color={colors.textTertiary} name="more-horizontal" size={iconSizes.md} />
        </View>
        {activeTrip ? (
          <View style={styles.activeSummary}>
            <View style={styles.progressCopy}><Text style={styles.activeText}>{activeTrip.progress.collected} of {activeTrip.progress.total} collected</Text><Text style={styles.percent}>{Math.round(progress * 100)}%</Text></View>
            <View accessibilityLabel={`${Math.round(progress * 100)} percent collected`} accessibilityRole="progressbar" style={styles.track}><View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} /></View>
          </View>
        ) : null}
        <View style={styles.cardFooter}><View style={styles.updated}><Feather color={colors.textTertiary} name="clock" size={15} /><Text style={styles.updatedText}>{formatUpdated(list.updated_at)}</Text></View>{!activeTrip ? <View style={styles.openLabel}><Text style={styles.openText}>Open</Text><Feather color={colors.text} name="arrow-right" size={15} /></View> : null}</View>
      </Pressable>
      {activeTrip && onContinue ? <PrimaryButton compact label="Resume trip" icon="arrow-right" onPress={onContinue} style={styles.continueButton} /> : null}
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
  listCard: { padding: spacing.md, borderRadius: radius.lg },
  archivedCard: { opacity: 0.78 },
  cardPress: { gap: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  listName: { ...typography.cardTitle, color: colors.text, fontSize: 17, flex: 1, minWidth: 0 },
  meta: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  activeSummary: { gap: spacing.xs },
  progressCopy: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  activeText: { ...typography.caption, color: colors.success },
  percent: { ...typography.caption, color: colors.textSecondary },
  track: { height: 6, overflow: "hidden", backgroundColor: colors.primaryMuted, borderRadius: radius.round },
  fill: { height: "100%", backgroundColor: colors.success, borderRadius: radius.round },
  cardFooter: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  updated: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  updatedText: { ...typography.secondary, color: colors.textSecondary, flexShrink: 1 },
  openLabel: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.surfaceSubtle, paddingHorizontal: spacing.sm },
  openText: { ...typography.caption, color: colors.text },
  continueButton: { marginTop: spacing.xs },
  itemRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  itemIcon: { width: 44, height: 44, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center" },
  itemName: { ...typography.cardTitle, color: colors.text },
  note: { ...typography.secondary, color: colors.textSecondary, fontStyle: "italic", marginTop: spacing.xs },
  menuButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  archivedEmpty: { ...typography.secondary, color: colors.textSecondary, paddingVertical: spacing.md }
});
