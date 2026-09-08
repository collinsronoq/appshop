export type ProductCategory={id:string;slug:string;display_name:string;sort_order:number};
export type HouseholdProduct={id:string;household_id:string;name:string;brand?:string|null;variant?:string|null;size_value?:number|null;size_unit?:string|null;usual_quantity:number;notes?:string|null;image_url?:string|null;archived_at?:string|null;category?:ProductCategory|null};
