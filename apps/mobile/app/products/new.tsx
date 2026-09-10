import { useRouter } from "expo-router";
import { ProductForm } from "../../src/products/product-form";
import { useHouseholds } from "../../src/households/household-context";
import { productApi } from "../../src/products/api-client";
export default function NewProduct() { const router = useRouter(); const { selected } = useHouseholds(); return <ProductForm title="Add product" onSave={async data => { if (!selected) return; const product = await productApi.create(selected.id, data); router.replace(`/products/${product.id}`); }} />; }
