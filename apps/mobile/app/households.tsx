import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useHouseholds } from "../src/households/household-context";
export default function Households(){const router=useRouter();const {households,selectedId,selectHousehold}=useHouseholds();return <View style={{padding:24,paddingTop:80}}><Text style={{fontSize:28,fontWeight:"800",marginBottom:20}}>Your households</Text>{households.map(h=><Pressable key={h.id} onPress={()=>{void selectHousehold(h.id);router.back();}} style={{padding:16,backgroundColor:h.id===selectedId?"#d9eadf":"#fff",borderRadius:12,marginBottom:8}}><Text style={{fontWeight:"700"}}>{h.name}</Text><Text>{h.member_count} members · {h.role}</Text></Pressable>)}</View>}
