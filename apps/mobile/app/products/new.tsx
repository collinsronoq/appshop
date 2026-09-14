import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { ProductForm } from "../../src/products/product-form";
import { useHouseholds } from "../../src/households/household-context";
import { productApi } from "../../src/products/api-client";
export default function NewProduct() { const router = useRouter(); const { selected } = useHouseholds(); return <ProductForm title="Add product" onSave={async (data, image) => { if (!selected) return; const product = await productApi.create(selected.id, data); if (image) { try { await productApi.uploadImage(selected.id, product.id, image); } catch (error) { Alert.alert("Photo not uploaded", error instanceof Error ? error.message : "The product was saved without its photo."); } } router.replace(`/products/${product.id}`); }} />; }
