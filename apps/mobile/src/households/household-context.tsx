import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/auth-context";
import { householdApiClient, HouseholdApiClient } from "./api-client";
import { selectedHouseholdStorage } from "./storage";
import type { HouseholdDetail, HouseholdSummary } from "./types";

type HouseholdContextValue = {
  households: HouseholdSummary[];
  selectedId: string | null;
  selected: HouseholdSummary | null;
  loading: boolean;
  selectHousehold(id: string): Promise<void>;
  createHousehold(name: string): Promise<HouseholdDetail>;
};
const Context = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children, client = householdApiClient }: PropsWithChildren<{ client?: HouseholdApiClient }>) {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["households"], queryFn: () => client.list(), enabled: status === "authenticated" });
  useEffect(() => {
    if (status !== "authenticated") { void selectedHouseholdStorage.remove(); return; }
    void selectedHouseholdStorage.get().then((stored) => setSelectedId(stored));
  }, [status]);
  useEffect(() => {
    const items = query.data ?? [];
    const first = items[0];
    if (!first) return;
    if (!selectedId || !items.some((item) => item.id === selectedId)) void selectedHouseholdStorage.set(first.id).then(() => setSelectedId(first.id));
  }, [query.data, selectedId]);
  const selectHousehold = useCallback(async (id: string) => { setSelectedId(id); await selectedHouseholdStorage.set(id); }, []);
  const create = useMutation({ mutationFn: (name: string) => client.create(name), onSuccess: async (created) => { await queryClient.invalidateQueries({ queryKey: ["households"] }); await selectHousehold(created.id); } });
  const effectiveId = status === "authenticated" ? selectedId : null;
  const value = useMemo(() => ({ households: query.data ?? [], selectedId: effectiveId, selected: (query.data ?? []).find((x) => x.id === effectiveId) ?? null, loading: query.isLoading || status === "loading", selectHousehold, createHousehold: (name: string) => create.mutateAsync(name) }), [query.data, query.isLoading, effectiveId, status, selectHousehold, create]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useHouseholds() { const value = useContext(Context); if (!value) throw new Error("useHouseholds must be used within HouseholdProvider"); return value; }
