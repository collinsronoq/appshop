import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHouseholds } from "../households/household-context";
import { productApi } from "../products/api-client";

export function ProductsScreen() {
  const router = useRouter();
  const { selected } = useHouseholds();
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["households", selected?.id, "products", search],
    queryFn: () => productApi.list(selected!.id, search ? `?query=${encodeURIComponent(search)}` : ""),
    enabled: Boolean(selected)
  });
  return <SafeAreaView style={styles.screen}><View style={styles.content}><Text style={styles.title}>Products</Text><TextInput placeholder="Search products" value={search} onChangeText={setSearch} style={styles.search}/>{query.isLoading?<ActivityIndicator/>:query.isError?<Text>Unable to load products.</Text>:!query.data?.length?<Text style={styles.empty}>No household products yet.</Text>:query.data.map((product)=><Pressable key={product.id} onPress={()=>router.push(`/products/${product.id}`)} style={styles.card}><Text style={styles.name}>{product.name}</Text><Text>{[product.brand,product.variant,product.size_value&&`${product.size_value} ${product.size_unit??""}`,product.category?.display_name].filter(Boolean).join(" · ")}</Text><Text>Usual quantity: {product.usual_quantity}</Text></Pressable>)}<Pressable onPress={()=>router.push("/products/new")} style={styles.button}><Text style={styles.buttonText}>Add Product</Text></Pressable></View></SafeAreaView>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:"#f7f4ed"},content:{padding:24},title:{fontSize:30,fontWeight:"800",marginBottom:16},search:{backgroundColor:"#fff",borderRadius:12,padding:14,marginBottom:16},empty:{fontSize:20,fontWeight:"700",marginTop:20},card:{backgroundColor:"#fff",padding:14,borderRadius:12,marginBottom:8},name:{fontWeight:"800",fontSize:17},button:{backgroundColor:"#245a43",padding:16,borderRadius:12,alignItems:"center",marginTop:16},buttonText:{color:"#fff",fontWeight:"700"}});
