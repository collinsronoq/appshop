export type ProductCategory={id:string;slug:string;display_name:string;sort_order:number};
export type ProductSubstitute={id:string;substitute_product_id?:string|null;substitute_name?:string|null;preference_rank:number;notes?:string|null};
export type HouseholdProduct={id:string;household_id:string;name:string;brand?:string|null;variant?:string|null;size_value?:number|null;size_unit?:string|null;usual_quantity:number;notes?:string|null;image_url?:string|null;archived_at?:string|null;category?:ProductCategory|null;preferred_substitutes?:ProductSubstitute[]};
