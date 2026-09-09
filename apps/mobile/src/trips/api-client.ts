import { authApiClient } from "../auth/api-client";
import type { ShoppingTrip } from "./types";
const call=(path:string,init?:RequestInit)=>authApiClient.authenticatedRequest<ShoppingTrip>(path,init);
export const tripApi={
 active:(h:string,l:string)=>authApiClient.authenticatedRequest<ShoppingTrip|null>(`/households/${h}/shopping-lists/${l}/active-trip`),
 start:(h:string,l:string,store_name?:string)=>call(`/households/${h}/shopping-lists/${l}/trips`,{method:"POST",body:JSON.stringify({store_name:store_name||null})}),
 get:(h:string,t:string)=>call(`/households/${h}/trips/${t}`),
 collect:(h:string,t:string,i:string,purchased_quantity?:number)=>call(`/households/${h}/trips/${t}/items/${i}/collect`,{method:"POST",body:JSON.stringify({purchased_quantity})}),
 skip:(h:string,t:string,i:string)=>call(`/households/${h}/trips/${t}/items/${i}/skip`,{method:"POST"}),
 undo:(h:string,t:string,i:string)=>call(`/households/${h}/trips/${t}/items/${i}/undo`,{method:"POST"}),
 cancel:(h:string,t:string)=>call(`/households/${h}/trips/${t}/cancel`,{method:"POST"})
};
