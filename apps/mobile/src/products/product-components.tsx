import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SurfaceCard } from "../design/components";
import { colors, radius, spacing, typography } from "../design/theme";
import { formatQuantity, formatSize } from "../design/format";
import { resolveProductImageUrl } from "./api-client";
import type { HouseholdProduct } from "./types";

export function ProductCard({ product, onPress }: { product: HouseholdProduct; onPress: () => void }) {
  const details = [product.brand, product.variant, formatSize(product.size_value, product.size_unit)].filter(Boolean).join(" · ") || "No product details";
  const imageUrl = resolveProductImageUrl(product.image_url);
  const [failedImageUrl, setFailedImageUrl] = useState<string>();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${product.name}`} onPress={onPress}><SurfaceCard style={styles.card}><View style={styles.imageWrap}>{imageUrl && failedImageUrl !== imageUrl ? <Image accessibilityLabel={`${product.name} photo`} onError={() => setFailedImageUrl(imageUrl)} source={{ uri: imageUrl }} style={styles.image} /> : <Feather color={colors.primary} name="package" size={24} />}</View><View style={styles.copy}><Text numberOfLines={1} style={styles.name}>{product.name}</Text><Text numberOfLines={2} style={styles.meta}>{details}</Text><View style={styles.footer}><Text numberOfLines={1} style={styles.category}>{product.category?.display_name ?? "Uncategorized"}</Text><Text numberOfLines={1} style={styles.usual}>Usually buy {formatQuantity(product.usual_quantity)}</Text></View></View><Feather color={colors.textSecondary} name="chevron-right" size={20} /></SurfaceCard></Pressable>;
}
const styles = StyleSheet.create({ card: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md }, imageWrap: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center", overflow: "hidden" }, image: { width: "100%", height: "100%" }, copy: { flex: 1, minWidth: 0 }, name: { ...typography.cardTitle, color: colors.text }, meta: { ...typography.secondary, color: colors.textSecondary, marginTop: 2 }, footer: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs }, category: { ...typography.caption, color: colors.primary, fontWeight: "700", flexShrink: 1 }, usual: { ...typography.caption, color: colors.textSecondary, flexShrink: 1 } });
