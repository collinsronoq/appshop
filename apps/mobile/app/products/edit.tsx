import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { ProductForm } from "../../src/products/product-form";
import { useHouseholds } from "../../src/households/household-context";
import { productApi } from "../../src/products/api-client";
export default function EditProduct() { const { id } = useLocalSearchParams<{ id: string }>(); const router = useRouter(); const { selected } = useHouseholds(); const qc = useQueryClient(); const q = useQuery({ queryKey: ["households", selected?.id, "products", id], queryFn: () => productApi.get(selected!.id, id), enabled: Boolean(selected && id) }); if (!q.data) return null; return <ProductForm title="Edit product" initial={q.data} onSave={async (data, image) => { if (!selected) return; await productApi.update(selected.id, id, data); if (image) { try { await productApi.uploadImage(selected.id, id, image); } catch (error) { Alert.alert("Photo not uploaded", error instanceof Error ? error.message : "The product changes were saved without the new photo."); } } await qc.invalidateQueries({ queryKey: ["households", selected.id, "products"] }); router.replace(`/products/${id}`); }} />; }
