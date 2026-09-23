import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { AppScreen, BackHeader, EmptyState, InlineError, LoadingState, PrimaryButton, SecondaryButton, SurfaceCard } from "../design/components";
import { formatQuantity, formatSize } from "../design/format";
import { colors, radius, spacing, typography } from "../design/theme";
import { useHouseholds } from "../households/household-context";
import { listApi } from "../lists/api-client";
import { pushNotificationApi } from "../notifications/api-client";
import { productApi } from "../products/api-client";
import type { HouseholdProduct } from "../products/types";
import { tripApi } from "../trips/api-client";

type Step = "choose" | "catalogue" | "custom" | "review" | "waiting";

export function UnavailableItemScreen() {
  const { tripId, tripItemId } = useLocalSearchParams<{ tripId: string; tripItemId: string }>();
  const router = useRouter();
  const { selected } = useHouseholds();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("choose");
  const [chosen, setChosen] = useState<HouseholdProduct | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [unit, setUnit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const trip = useQuery({ queryKey: ["households", selected?.id, "trips", tripId], queryFn: () => tripApi.get(selected!.id, tripId), enabled: Boolean(selected && tripId) });
  const item = trip.data?.items.find((entry) => entry.id === tripItemId);
  const list = useQuery({ queryKey: ["households", selected?.id, "shopping-lists", trip.data?.shopping_list_id], queryFn: () => listApi.get(selected!.id, trip.data!.shopping_list_id), enabled: Boolean(selected && trip.data?.shopping_list_id) });
  const source = list.data?.items?.find((entry) => entry.id === item?.shopping_list_item_id);
  const product = useQuery({ queryKey: ["households", selected?.id, "products", source?.household_product_id], queryFn: () => productApi.get(selected!.id, source!.household_product_id!), enabled: Boolean(selected && source?.household_product_id) });
  const products = useQuery({ queryKey: ["households", selected?.id, "products", "replacement"], queryFn: () => productApi.listFiltered(selected!.id, "", undefined, false), enabled: Boolean(selected && step === "catalogue") });

  if (trip.isLoading) return <AppScreen><LoadingState rows={4} /></AppScreen>;
  if (trip.isError || !item) return <AppScreen><InlineError onRetry={() => void trip.refetch()} /></AppScreen>;

  const preferred = product.data?.preferred_substitutes?.[0];
  const preferredLabel = preferred?.substitute_name ?? null;
  const customName = name.trim();
  const hasProposal = Boolean(chosen || customName);
  const proposal = chosen
    ? { proposed_product_id: chosen.id }
    : { proposed_name: customName, proposed_brand: brand.trim() || null, proposed_size_value: size ? Number(size) : null, proposed_size_unit: unit.trim() || null };

  const applyPreferred = async () => {
    if (!selected || !preferred?.substitute_product_id) return;
    setSaving(true);
    try {
      await pushNotificationApi.applyPreferred(selected.id, tripId, tripItemId);
      await queryClient.invalidateQueries({ queryKey: ["households", selected.id, "trips", tripId] });
      router.back();
    } catch (caught) {
      Alert.alert("Couldn’t use substitute", caught instanceof Error ? caught.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    if (!selected || !hasProposal) {
      setError("Choose or enter a replacement first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await pushNotificationApi.createRequest(selected.id, tripId, tripItemId, proposal);
      await queryClient.invalidateQueries({ queryKey: ["households", selected.id, "substitutions", "pending"] });
      setStep("waiting");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t send the request.");
    } finally {
      setSaving(false);
    }
  };

  const selectProduct = (next: HouseholdProduct) => {
    setChosen(next);
    setError("");
    setStep("review");
  };

  const beginCustom = () => {
    setChosen(null);
    setError("");
    setStep("custom");
  };

  const selectedDetails = chosen
    ? [chosen.brand, chosen.variant, formatSize(chosen.size_value, chosen.size_unit)].filter(Boolean).join(" · ")
    : [brand.trim(), formatSize(size, unit.trim())].filter(Boolean).join(" · ");

  return <AppScreen keyboardSafe>
    <BackHeader title={step === "waiting" ? "Waiting for approval" : "Can’t find this item?"} onBack={() => router.back()} />
    <SurfaceCard><Text style={styles.label}>Requested</Text><Text style={styles.name}>{item.name}</Text><Text style={styles.meta}>{[item.brand, item.variant, formatSize(item.size_value, item.size_unit)].filter(Boolean).join(" · ")} · Qty {formatQuantity(item.requested_quantity)}</Text></SurfaceCard>

    {step === "choose" ? <>
      <Text style={styles.heading}>What would you like to do?</Text>
      {preferredLabel ? <SurfaceCard style={styles.preferred}><Text style={styles.label}>Preferred substitute</Text><Text style={styles.name}>{preferredLabel}</Text><PrimaryButton label="Use this substitute" icon="check" loading={saving} onPress={() => void applyPreferred()} /></SurfaceCard> : null}
      <View style={styles.actionStack}>
        <SecondaryButton label="Choose from catalogue" icon="search" onPress={() => { setChosen(null); setError(""); setStep("catalogue"); }} />
        <SecondaryButton label="Enter custom replacement" icon="edit-3" onPress={beginCustom} />
        <SecondaryButton label="Skip item" icon="minus-circle" onPress={() => router.back()} />
      </View>
    </> : null}

    {step === "catalogue" ? <>
      <Text style={styles.heading}>Choose from catalogue</Text>
      <Text style={styles.guidance}>Select one product to review before asking your household.</Text>
      {products.isLoading ? <LoadingState rows={3} /> : products.isError ? <InlineError message="Couldn’t load household products." onRetry={() => void products.refetch()} /> : products.data?.filter((entry) => entry.id !== source?.household_product_id).length ? <View style={styles.productList}>{products.data.filter((entry) => entry.id !== source?.household_product_id).map((entry) => <SecondaryButton key={entry.id} label={[entry.name, formatSize(entry.size_value, entry.size_unit)].filter(Boolean).join(" · ")} onPress={() => selectProduct(entry)} />)}</View> : <EmptyState icon="package" title="No replacements available" body="Add another product to your household catalogue or enter a custom replacement." />}
      <View style={styles.actionStack}><SecondaryButton label="Enter custom replacement" icon="edit-3" onPress={beginCustom} /><SecondaryButton label="Back" onPress={() => setStep("choose")} /></View>
    </> : null}

    {step === "custom" ? <>
      <Text style={styles.heading}>Custom replacement</Text>
      <SurfaceCard>
        <TextInput accessibilityLabel="Replacement name" autoFocus placeholder="Name *" value={name} onChangeText={setName} style={styles.input} />
        <TextInput accessibilityLabel="Replacement brand" placeholder="Brand" value={brand} onChangeText={setBrand} style={styles.input} />
        <View style={styles.row}><TextInput accessibilityLabel="Replacement size" placeholder="Size" value={size} onChangeText={setSize} keyboardType="numeric" style={[styles.input, styles.flex]} /><TextInput accessibilityLabel="Replacement unit" placeholder="Unit" value={unit} onChangeText={setUnit} style={[styles.input, styles.unit]} /></View>
        <View style={styles.actionStack}><PrimaryButton label="Review replacement" disabled={!customName} onPress={() => setStep("review")} /><SecondaryButton label="Back" onPress={() => setStep("choose")} /></View>
      </SurfaceCard>
    </> : null}

    {step === "review" ? <>
      <Text style={styles.heading}>Review replacement</Text>
      <SurfaceCard style={styles.proposalCard}><Text style={styles.label}>Proposed</Text><Text style={styles.name}>{chosen?.name ?? customName}</Text><Text style={styles.meta}>{selectedDetails || "No additional product details"}</Text></SurfaceCard>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <View style={styles.actionStack}><PrimaryButton label="Ask household" icon="send" loading={saving} disabled={!hasProposal} onPress={() => void send()} /><SecondaryButton label={chosen ? "Choose another product" : "Edit replacement"} onPress={() => setStep(chosen ? "catalogue" : "custom")} /><SecondaryButton label="Cancel" onPress={() => setStep("choose")} /></View>
    </> : null}

    {step === "waiting" ? <SurfaceCard style={styles.waiting}><Text style={styles.name}>Waiting for household approval</Text><Text style={styles.meta}>{chosen?.name ?? customName} instead of {item.name}</Text><Text style={styles.meta}>Another household member must approve before this replacement can be applied.</Text><PrimaryButton label="Return to shopping" onPress={() => router.back()} /></SurfaceCard> : null}
  </AppScreen>;
}

const styles = StyleSheet.create({
  label: { ...typography.caption, color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  name: { ...typography.cardTitle, color: colors.text, marginTop: spacing.xs },
  meta: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  heading: { ...typography.sectionTitle, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  guidance: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  preferred: { backgroundColor: colors.primarySubtle, gap: spacing.md, marginBottom: spacing.md },
  proposalCard: { marginBottom: spacing.md },
  waiting: { gap: spacing.md, marginTop: spacing.xl },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, ...typography.body, color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
  unit: { width: 100 },
  actionStack: { gap: spacing.sm },
  productList: { gap: spacing.sm, marginBottom: spacing.md },
  error: { ...typography.secondary, color: colors.danger, marginBottom: spacing.md }
});
