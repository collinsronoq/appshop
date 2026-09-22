import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from "react-native";

import { colors } from "../design/theme";
import { resolveProductImageUrl } from "./api-client";

const LOCAL_IMAGES = {
  bread: require("../../assets/images/product-bread.png"),
  milk: require("../../assets/images/product-milk.png"),
  tomatoes: require("../../assets/images/product-tomatoes.png"),
  eggs: require("../../assets/images/product-eggs.png"),
  detergent: require("../../assets/images/product-detergent.png"),
  household: require("../../assets/images/category-household.png")
} as const;

function normalizedWords(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

/** Conservative demo matching: only whole, unambiguous item words are accepted. */
export function localProductImage(name: string, categorySlug?: string | null) {
  const words = new Set(normalizedWords(name));
  if (words.has("bread") || words.has("sourdough") || words.has("baguette")) return LOCAL_IMAGES.bread;
  if (words.has("milk") && !["chocolate", "powder", "formula", "soap"].some((word) => words.has(word))) return LOCAL_IMAGES.milk;
  if ((words.has("tomato") || words.has("tomatoes")) && !["sauce", "paste", "soup", "juice"].some((word) => words.has(word))) return LOCAL_IMAGES.tomatoes;
  if ((words.has("egg") || words.has("eggs")) && !["noodle", "noodles", "pasta", "powder"].some((word) => words.has(word))) return LOCAL_IMAGES.eggs;
  if (words.has("detergent") || (words.has("laundry") && words.has("soap"))) return LOCAL_IMAGES.detergent;
  const category = categorySlug?.toLocaleLowerCase() ?? "";
  const genericListName = ["grocery", "groceries", "shopping", "list", "essentials"].some((word) => words.has(word));
  if (!genericListName && (category === "household" || category.includes("clean") || category.includes("laundr") || category.includes("household"))) return LOCAL_IMAGES.household;
  return undefined;
}

export function ProductArtwork({
  name,
  imageUrl,
  categorySlug,
  style,
  fit = "contain"
}: {
  name: string;
  imageUrl?: string | null;
  categorySlug?: string | null;
  style?: StyleProp<ImageStyle>;
  fit?: "contain" | "cover";
}) {
  const remote = resolveProductImageUrl(imageUrl);
  const [failedRemote, setFailedRemote] = useState<string>();
  const local = localProductImage(name, categorySlug);
  const source = remote && failedRemote !== remote ? { uri: remote } : local;

  if (source) {
    return <Image accessibilityLabel={`${name} image`} onError={remote && failedRemote !== remote ? () => setFailedRemote(remote) : undefined} resizeMode={fit} source={source} style={[styles.image, style]} />;
  }
  return <View accessibilityLabel={`${name} image unavailable`} style={[styles.placeholder, style]}><Feather color={colors.sageStrong} name="shopping-bag" size={24} /></View>;
}

export function ListArtwork({
  name,
  items,
  style
}: {
  name: string;
  items?: { name: string; brand?: string | null; variant?: string | null; size_value?: number | null; size_unit?: string | null; image_url?: string | null; category_slug?: string | null }[];
  style?: StyleProp<ImageStyle>;
}) {
  const knownItem = items?.find((item) => Boolean(resolveProductImageUrl(item.image_url) || localProductImage(item.name, item.category_slug))) ?? (items?.length ? items[0] : undefined);
  if (knownItem) {
    return <ProductArtwork categorySlug={knownItem.category_slug} imageUrl={knownItem.image_url} name={knownItem.name} style={style} />;
  }
  const listImage = localProductImage(name);
  if (listImage) {
    return <ProductArtwork name={name} style={style} />;
  }
  return <View accessibilityLabel={`${name} shopping basket artwork`} style={[styles.placeholder, style]}><Feather color={colors.primary} name="shopping-bag" size={24} /></View>;
}

const styles = StyleSheet.create({
  image: { width: "100%", height: "100%", backgroundColor: colors.surfaceMuted },
  placeholder: { alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySubtle }
});
