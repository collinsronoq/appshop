import Feather from "@expo/vector-icons/Feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { AppScreen, BackHeader, DestructiveButton, IconButton, InlineError, LoadingState, ModalSheet, PrimaryButton, SecondaryButton, SectionHeader, SurfaceCard } from "../design/components";
import { colors, radius, spacing, typography } from "../design/theme";
import { useHouseholds } from "../households/household-context";
import { listApi } from "../lists/api-client";
import { ListItemRow } from "../lists/list-components";
import { useShoppingListRealtime } from "../realtime/use-shopping-list-realtime";
import { tripApi } from "../trips/api-client";

export function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const router = useRouter(); const { selected } = useHouseholds(); const qc = useQueryClient();
  const [menu, setMenu] = useState<"list" | string | null>(null); const [renameOpen, setRenameOpen] = useState(false); const [rename, setRename] = useState(""); const [editing, setEditing] = useState<any>(null); const [saving, setSaving] = useState(false);
  const live = useShoppingListRealtime(selected?.id, id); const list = useQuery({ queryKey: ["households", selected?.id, "shopping-lists", id], queryFn: () => listApi.get(selected!.id, id), enabled: Boolean(selected && id) }); const active = useQuery({ queryKey: ["households", selected?.id, "shopping-lists", id, "active-trip"], queryFn: () => tripApi.active(selected!.id, id), enabled: Boolean(selected && id) });
  const invalidate = () => { if (selected) void Promise.all([qc.invalidateQueries({ queryKey: ["households", selected.id, "shopping-lists", id] }), qc.invalidateQueries({ queryKey: ["households", selected.id, "shopping-lists"] })]); };
  if (list.isLoading) return <AppScreen><LoadingState rows={4} /></AppScreen>; if (list.isError || !list.data) return <AppScreen><InlineError onRetry={() => void list.refetch()} /></AppScreen>;
  const data = list.data; const start = () => active.data ? router.push(`/trip/${active.data.id}`) : router.push(`/lists/${id}/start`);
  const archive = () => { if (!selected) return; if (active.data) { Alert.alert("Active trip", "Finish or cancel the active trip before archiving this list."); return; } Alert.alert("Archive list?", "You can still find it in Archived.", [{ text: "Cancel", style: "cancel" }, { text: "Archive", onPress: async () => { await listApi.archive(selected.id, id); router.back(); } }]); };
  const saveRename = async () => { if (!selected || !rename.trim()) return; setSaving(true); try { await listApi.rename(selected.id, id, rename.trim()); invalidate(); setRenameOpen(false); } finally { setSaving(false); } };
  const removeItem = (itemId: string) => { if (!selected) return; Alert.alert("Remove item?", "This removes it from the list.", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: async () => { try { await listApi.removeItem(selected.id, id, itemId); invalidate(); } catch (error) { Alert.alert("Can’t remove item", error instanceof Error ? error.message : "Trip history prevents deleting this item."); } } }]); };
  const updateItem = async () => { if (!selected || !editing) return; setSaving(true); try { await listApi.updateItem(selected.id, id, editing.id, { requested_quantity: Number(editing.requested_quantity) || 1, notes: editing.notes || null }); invalidate(); setEditing(null); } finally { setSaving(false); } };
  return <AppScreen><BackHeader title={data.name} onBack={() => router.back()} />
    <SurfaceCard style={styles.listSummary}>
      <View style={styles.listSummaryHeader}>
        <View style={styles.listSummaryCopy}>
          <Text numberOfLines={2} style={styles.listTitle}>{data.name}</Text>
          <Text style={styles.meta}>{data.item_count} item{data.item_count === 1 ? "" : "s"} · {live === "live" ? "Live updates" : live === "connecting" ? "Connecting updates…" : "Updates unavailable"}</Text>
        </View>
        <IconButton icon="more-vertical" label="List actions" onPress={() => setMenu("list")} />
      </View>
      {active.data ? <View style={styles.tripSummary}><View style={styles.tripTitle}><Feather color={colors.success} name="shopping-cart" size={18} /><Text style={styles.tripText}>Shopping in progress</Text></View><Text style={styles.meta}>{active.data.progress.collected} of {active.data.progress.total} collected</Text><PrimaryButton label="Continue shopping" icon="arrow-right" onPress={start} /></View> : <View style={styles.startSummary}><Text style={styles.startHint}>{data.item_count ? "Everything is ready for your next shop." : "Add an item before you start shopping."}</Text><PrimaryButton label="Start shopping" icon="shopping-cart" onPress={start} disabled={!data.item_count} /></View>}
    </SurfaceCard>
    <SectionHeader title="Items" actionLabel="Add item" onAction={() => router.push(`/lists/${id}/add`)} />
    {data.items?.length ? <SurfaceCard style={styles.items}>{data.items.map(item => <ListItemRow key={item.id} item={item} onMenu={() => setMenu(item.id)} />)}</SurfaceCard> : <SurfaceCard><Text style={styles.emptyTitle}>Your list is ready for ideas</Text><Text style={styles.meta}>Add household products or a custom item to get started.</Text></SurfaceCard>}
    {menu === "list" ? <ModalSheet onClose={() => setMenu(null)} title="List actions"><SecondaryButton label="Rename list" icon="edit-2" onPress={() => { setMenu(null); setRename(data.name); setRenameOpen(true); }} /><SecondaryButton label="Archive list" icon="archive" onPress={() => { setMenu(null); archive(); }} /></ModalSheet> : null}
    {menu && menu !== "list" ? <ModalSheet onClose={() => setMenu(null)} title="Item actions"><SecondaryButton label="Edit item" icon="edit-2" onPress={() => { const item = data.items?.find(entry => entry.id === menu); setMenu(null); setEditing(item ? { ...item } : null); }} /><DestructiveButton label="Remove item" icon="trash-2" onPress={() => { const itemId = menu; setMenu(null); removeItem(itemId); }} /></ModalSheet> : null}
    {renameOpen ? <ModalSheet onClose={() => setRenameOpen(false)} title="Rename list"><TextInput accessibilityLabel="List name" value={rename} onChangeText={setRename} autoFocus style={styles.input} /><PrimaryButton label="Save name" loading={saving} onPress={() => void saveRename()} /><SecondaryButton label="Cancel" onPress={() => setRenameOpen(false)} /></ModalSheet> : null}
    {editing ? <ModalSheet onClose={() => setEditing(null)} title="Edit item"><Text style={styles.itemLabel}>{editing.name}</Text><TextInput accessibilityLabel="Quantity" keyboardType="numeric" value={String(editing.requested_quantity)} onChangeText={value => setEditing({ ...editing, requested_quantity: value })} style={styles.input} /><TextInput accessibilityLabel="Notes" placeholder="Notes (optional)" value={editing.notes ?? ""} onChangeText={value => setEditing({ ...editing, notes: value })} style={styles.input} /><PrimaryButton label="Save item" loading={saving} onPress={() => void updateItem()} /><SecondaryButton label="Cancel" onPress={() => setEditing(null)} /></ModalSheet> : null}
  </AppScreen>;
}
const styles = StyleSheet.create({ listSummary: { gap: spacing.lg, marginBottom: spacing.lg }, listSummaryHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md }, listSummaryCopy: { flex: 1, minWidth: 0 }, listTitle: { ...typography.screenTitle, color: colors.text, fontSize: 22, lineHeight: 28 }, tripSummary: { gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.lg }, startSummary: { gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.lg }, startHint: { ...typography.secondary, color: colors.textSecondary }, tripTitle: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, tripText: { ...typography.bodyStrong, color: colors.success }, meta: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs }, items: { paddingVertical: spacing.xs }, emptyTitle: { ...typography.cardTitle, color: colors.text }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, ...typography.body, color: colors.text }, itemLabel: { ...typography.bodyStrong, color: colors.text } });
