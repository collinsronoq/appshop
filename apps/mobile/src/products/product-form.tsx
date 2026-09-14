import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState, type ComponentProps } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppScreen, BackHeader, InlineError, LoadingState, PrimaryButton, SecondaryButton } from "../design/components";
import { colors, radius, spacing, typography } from "../design/theme";
import { useHouseholds } from "../households/household-context";
import { productApi, resolveProductImageUrl } from "./api-client";
import type { ProductImageUpload } from "./api-client";
import type { HouseholdProduct } from "./types";

export function ProductForm({ initial, title, onSave }: { initial?: HouseholdProduct; title: string; onSave: (data: Record<string, unknown>, image?: ProductImageUpload) => Promise<void> }) {
  const router = useRouter();
  const { selected } = useHouseholds();
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [variant, setVariant] = useState(initial?.variant ?? "");
  const [size, setSize] = useState(initial?.size_value ? String(initial.size_value) : "");
  const [unit, setUnit] = useState(initial?.size_unit ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category?.id ?? "");
  const [quantity, setQuantity] = useState(String(initial?.usual_quantity ?? 1));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [image, setImage] = useState<ProductImageUpload | undefined>();
  const [failedPreviewUri, setFailedPreviewUri] = useState<string>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const categories = useQuery({ queryKey: ["product-categories"], queryFn: productApi.categories });
  const previewUri = image?.uri ?? resolveProductImageUrl(initial?.image_url);

  const pickImage = async () => {
    setError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo access was not granted. You can still save the product without a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.85 });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (!asset) return;
      setFailedPreviewUri(undefined);
      setImage({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
    }
  };

  const save = async () => {
    if (!name.trim()) { setError("Product name is required."); return; }
    if (Number(quantity) <= 0) { setError("Usual quantity must be greater than 0."); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        brand: brand.trim() || null,
        variant: variant.trim() || null,
        size_value: size ? Number(size) : null,
        size_unit: unit.trim() || null,
        category_id: categoryId || null,
        usual_quantity: Number(quantity),
        notes: notes.trim() || null
      }, image);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t save this product.");
    } finally {
      setSaving(false);
    }
  };

  if (!selected) return <AppScreen><InlineError /></AppScreen>;

  return (
    <AppScreen keyboardSafe>
      <BackHeader title={title} onBack={() => router.back()} />
      <View style={styles.photoArea}>
        {previewUri && failedPreviewUri !== previewUri ? <Image accessibilityLabel="Selected product photo" onError={() => setFailedPreviewUri(previewUri)} source={{ uri: previewUri }} style={styles.photo} /> : <View style={styles.photoPlaceholder}><Text style={styles.photoPlaceholderText}>{failedPreviewUri === previewUri ? "Photo unavailable" : "No photo selected"}</Text></View>}
        <SecondaryButton label={previewUri ? "Change photo" : "Add photo"} icon="image" onPress={() => void pickImage()} />
        {image ? <Pressable accessibilityRole="button" onPress={() => setImage(undefined)}><Text style={styles.removePhoto}>Remove selected photo</Text></Pressable> : null}
      </View>
      <Text style={styles.section}>Product details</Text>
      <Field label="Name *" value={name} onChangeText={setName} placeholder="e.g. Whole milk" />
      <Field label="Brand" value={brand} onChangeText={setBrand} placeholder="e.g. Brookside" />
      <Field label="Variant" value={variant} onChangeText={setVariant} placeholder="e.g. Full cream" />
      <View style={styles.row}>
        <View style={styles.flex}><Field label="Size" value={size} onChangeText={setSize} placeholder="500" keyboardType="numeric" /></View>
        <View style={styles.unit}><Field label="Unit" value={unit} onChangeText={setUnit} placeholder="ml" /></View>
      </View>
      <Text style={styles.label}>Category</Text>
      {categories.isLoading ? <LoadingState rows={1} /> : (
        <View style={styles.chips}>
          {(categories.data ?? []).map((category) => {
            const selectedCategory = categoryId === category.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCategory }}
                key={category.id}
                onPress={() => setCategoryId(category.id)}
                style={[styles.chip, selectedCategory ? styles.selectedChip : null]}
              >
                <Text style={[styles.chipText, selectedCategory ? styles.selectedChipText : null]}>{category.display_name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <Text style={styles.label}>Usual quantity</Text>
      <View style={styles.stepper}>
        <SecondaryButton label="−" fullWidth={false} onPress={() => setQuantity(String(Math.max(1, Number(quantity) - 1)))} />
        <Text style={styles.quantity}>{quantity}</Text>
        <SecondaryButton label="+" fullWidth={false} onPress={() => setQuantity(String(Number(quantity) + 1))} />
      </View>
      <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" multiline />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Save product" loading={saving} onPress={() => void save()} />
    </AppScreen>
  );
}

function Field({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  const accessibilityLabel = props.accessibilityLabel ?? label.replace(/\s*\*$/, "");
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} accessibilityLabel={accessibilityLabel} style={[styles.input, props.multiline ? styles.multiline : null]} /></View>;
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, color: colors.text, marginBottom: spacing.md },
  photoArea: { gap: spacing.sm, marginBottom: spacing.lg },
  photo: { width: "100%", height: 180, borderRadius: radius.lg },
  photoPlaceholder: { height: 112, borderRadius: radius.lg, backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center" },
  photoPlaceholderText: { ...typography.secondary, color: colors.textSecondary },
  removePhoto: { ...typography.secondary, color: colors.danger, textAlign: "center", paddingVertical: spacing.sm },
  field: { marginBottom: spacing.md },
  label: { ...typography.secondary, color: colors.text, fontWeight: "700", marginBottom: spacing.xs },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, ...typography.body, color: colors.text },
  multiline: { minHeight: 92, paddingTop: spacing.md, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
  unit: { width: 110 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  selectedChip: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { ...typography.secondary, color: colors.primary, fontWeight: "700" },
  selectedChipText: { color: colors.surface },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  quantity: { ...typography.sectionTitle, color: colors.text },
  error: { ...typography.secondary, color: colors.danger, marginBottom: spacing.md }
});
