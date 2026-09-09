import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useHouseholds } from "../../../src/households/household-context";
import { tripApi } from "../../../src/trips/api-client";
export default function StartTrip(){const {id}=useLocalSearchParams<{id:string}>();const {selected}=useHouseholds();const router=useRouter();const [store,setStore]=useState("");return <View style={{padding:24,paddingTop:80}}><Text style={{fontSize:28,fontWeight:"800"}}>Start shopping</Text><TextInput placeholder="Store (optional)" value={store} onChangeText={setStore} style={{borderWidth:1,borderColor:"#ddd",padding:14,borderRadius:10,marginTop:20}}/><Pressable onPress={async()=>{const trip=await tripApi.start(selected!.id,id,store);router.replace(`/trip/${trip.id}`)}} style={{marginTop:16,backgroundColor:"#245a43",padding:15,borderRadius:10,alignItems:"center"}}><Text style={{color:"#fff",fontWeight:"700"}}>Begin trip</Text></Pressable></View>}
