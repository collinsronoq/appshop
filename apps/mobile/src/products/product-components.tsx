import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SurfaceCard } from "../design/components";
import { colors, radius, spacing, typography } from "../design/theme";
import { formatQuantity, formatSize } from "../design/format";
import type { HouseholdProduct } from "./types";
import { ProductArtwork } from "./product-images";

export function ProductCard({ product, onPress, layout = "row" }: { product: HouseholdProduct; onPress: () => void; layout?: "row" | "grid" }) {
  const details = [product.brand, product.variant, formatSize(product.size_value, product.size_unit)].filter(Boolean).join(" · ") || "No product details";
  const grid = layout === "grid";
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${product.name}`} onPress={onPress} style={grid ? styles.gridPressable : undefined}><SurfaceCard style={[styles.card, grid ? styles.gridCard : null]}><View style={[styles.imageWrap, grid ? styles.gridImageWrap : null]}><ProductArtwork categorySlug={product.category?.slug} imageUrl={product.image_url} name={product.name} /></View><View style={styles.copy}><Text numberOfLines={2} style={styles.name}>{product.name}</Text><Text numberOfLines={2} style={styles.meta}>{details}</Text><View style={[styles.footer, grid ? styles.gridFooter : null]}><Text numberOfLines={2} style={styles.category}>{product.category?.display_name ?? "Uncategorized"}</Text><Text numberOfLines={2} style={styles.usual}>Usually buy {formatQuantity(product.usual_quantity)}</Text></View></View>{grid ? <View style={styles.openHint}><Feather color={colors.surface} name="chevron-right" size={17} /></View> : <Feather color={colors.textSecondary} name="chevron-right" size={20} />}</SurfaceCard></Pressable>;
}
const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  gridPressable: { width: "47.5%" },
  gridCard: { minHeight: 250, alignItems: "stretch", flexDirection: "column", gap: spacing.sm, padding: spacing.sm, position: "relative" },
  imageWrap: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  gridImageWrap: { width: "100%", height: 138, borderRadius: radius.md },
  copy: { flex: 1, minWidth: 0 },
  name: { ...typography.cardTitle, color: colors.text },
  meta: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 },
  footer: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.xs },
  gridFooter: { flexDirection: "column", gap: 2 },
  category: { ...typography.caption, color: colors.primary, fontWeight: "700", flexShrink: 1, minWidth: 0 },
  usual: { ...typography.caption, color: colors.textSecondary, flexShrink: 0 },
  openHint: { position: "absolute", right: spacing.sm, top: spacing.sm, width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: colors.primary }
});
