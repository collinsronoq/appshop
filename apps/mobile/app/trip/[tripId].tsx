import { useLocalSearchParams } from "expo-router";
import { ShoppingModeScreen } from "../../src/screens/shopping-mode-screen";
export default function TripRoute(){const {tripId}=useLocalSearchParams<{tripId:string}>();return <ShoppingModeScreen tripId={tripId}/>;}
