import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuth } from "../../src/auth/auth-context";
import { householdApiClient } from "../../src/households/api-client";
export default function InvitationRoute(){const {status}=useAuth();const router=useRouter();const {token}=useLocalSearchParams<{token:string}>();const [error,setError]=useState<string|null>(null);useEffect(()=>{if(status!=="authenticated"||!token)return;void householdApiClient.accept(token).then(()=>router.replace("/(app)"),()=>setError("This invitation is invalid or expired."));},[status,token,router]);if(status==="loading")return <ActivityIndicator/>;if(status==="unauthenticated")return <Redirect href={{pathname:"/login",params:{invite:token}}}/>;return <View style={{padding:24,paddingTop:100}}><Text>{error??"Joining household…"}</Text></View>}
