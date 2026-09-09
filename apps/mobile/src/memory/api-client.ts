import { authApiClient } from "../auth/api-client";
export type Memory={household_product_id:string;name:string;brand?:string|null;size_value?:number|null;size_unit?:string|null;usual_quantity:number;last_purchased_at:string;purchase_count:number;archived:boolean};
export const memoryApi={recent:(h:string)=>authApiClient.authenticatedRequest<{items:Memory[]}>(`/households/${h}/purchasing-memory/recent`),frequent:(h:string)=>authApiClient.authenticatedRequest<{items:Memory[]}>(`/households/${h}/purchasing-memory/frequent`)};
