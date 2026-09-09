import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "../auth/auth-context";
import { useHouseholds } from "../households/household-context";
import { pushNotificationApi } from "../notifications/api-client";
import { useShoppingListRealtime } from "../realtime/use-shopping-list-realtime";
import { tripApi } from "../trips/api-client";

type Props = { tripId: string; substitutionId?: string };

export function ShoppingModeScreen({ tripId, substitutionId }: Props) {
  const { user } = useAuth();
  const { selected } = useHouseholds();
  const queryClient = useQueryClient();
  const router = useRouter();
  const tripQuery = useQuery({
    queryKey: ["households", selected?.id, "trips", tripId],
    queryFn: () => tripApi.get(selected!.id, tripId),
    enabled: Boolean(selected)
  });
  const substitutionQuery = useQuery({
    queryKey: ["households", selected?.id, "substitutions", substitutionId],
    queryFn: () => pushNotificationApi.getSubstitution(selected!.id, substitutionId!),
    enabled: Boolean(selected && substitutionId),
    retry: false
  });
  const trip = tripQuery.data;
  const substitution = substitutionQuery.data;
  useShoppingListRealtime(selected?.id, trip?.shopping_list_id, tripId);

  if (!trip) return <Text style={{ padding: 24 }}>Loading trip…</Text>;

  const act = async (action: () => Promise<unknown>) => {
    await action();
    await queryClient.invalidateQueries({
      queryKey: ["households", selected?.id, "trips", tripId]
    });
  };
  const decide = async (decision: "approve" | "reject") => {
    if (!selected || !substitutionId) return;
    await pushNotificationApi.decide(selected.id, substitutionId, decision);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["households", selected.id, "substitutions", substitutionId] }),
      queryClient.invalidateQueries({ queryKey: ["households", selected.id, "trips", tripId] })
    ]);
  };
  const complete = () =>
    Alert.alert("Complete this shopping trip?", "This trip cannot be reopened.", [
      { text: "Cancel", style: "cancel" },
      { text: "Complete", onPress: async () => {
        await tripApi.complete(selected!.id, trip.id);
        await queryClient.invalidateQueries();
        router.replace("/purchases");
      } }
    ]);

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 70 }}>
      <Text style={{ fontSize: 30, fontWeight: "800" }}>Shopping mode</Text>
      <Text style={{ marginTop: 8, fontSize: 18 }}>{trip.progress.collected} of {trip.progress.total} collected</Text>
      {substitutionId && substitutionQuery.isError ? (
        <View style={{ padding: 16, marginTop: 16, borderRadius: 14, backgroundColor: "#f4f1ec" }}>
          <Text style={{ fontWeight: "700" }}>Replacement unavailable</Text>
          <Text style={{ marginTop: 6 }}>This shopping decision is no longer available.</Text>
        </View>
      ) : null}
      {substitution ? (
        <View style={{ padding: 16, marginTop: 16, borderRadius: 14, backgroundColor: "#fff4ce" }}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>Replacement {substitution.status}</Text>
          <Text style={{ marginTop: 6 }}>{substitution.proposed_name}</Text>
          {substitution.status === "pending" && substitution.requested_by_user_id !== user?.id ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Pressable onPress={() => void decide("approve")} style={{ backgroundColor: "#245a43", padding: 12, borderRadius: 10 }}><Text style={{ color: "#fff" }}>Approve</Text></Pressable>
              <Pressable onPress={() => void decide("reject")} style={{ backgroundColor: "#eee", padding: 12, borderRadius: 10 }}><Text>Reject</Text></Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
      {trip.progress.pending > 0 ? <Text style={{ marginTop: 12, color: "#a33" }}>{trip.progress.pending} items still need attention</Text> : null}
      {trip.items.map((item) => (
        <View key={item.id} style={{ padding: 16, marginTop: 12, borderRadius: 14, backgroundColor: item.status === "collected" ? "#d9f5df" : "#fff" }}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>{item.name}</Text>
          <Text>{item.requested_quantity} {item.brand ?? ""}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            {item.status !== "collected" ? <Pressable onPress={() => void act(() => tripApi.collect(selected!.id, trip.id, item.id))} style={{ backgroundColor: "#245a43", padding: 12, borderRadius: 10 }}><Text style={{ color: "#fff" }}>Collected</Text></Pressable> : null}
            {item.status === "pending" ? <Pressable onPress={() => void act(() => tripApi.skip(selected!.id, trip.id, item.id))} style={{ backgroundColor: "#eee", padding: 12, borderRadius: 10 }}><Text>Skip</Text></Pressable> : <Pressable onPress={() => void act(() => tripApi.undo(selected!.id, trip.id, item.id))} style={{ backgroundColor: "#eee", padding: 12, borderRadius: 10 }}><Text>Undo</Text></Pressable>}
          </View>
        </View>
      ))}
      {trip.progress.pending === 0 ? <Pressable onPress={complete} style={{ marginTop: 20, backgroundColor: "#245a43", padding: 16, borderRadius: 12, alignItems: "center" }}><Text style={{ color: "#fff", fontWeight: "700" }}>Complete shopping</Text></Pressable> : null}
      <Pressable onPress={() => void act(() => tripApi.cancel(selected!.id, trip.id))} style={{ marginTop: 20, padding: 15, alignItems: "center" }}><Text>End trip</Text></Pressable>
    </ScrollView>
  );
}
