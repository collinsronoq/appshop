# Domain and Data Model

## 1. Core Model

```text
User
 |
 +--< HouseholdMembership >-- Household
                               |
                               +--< HouseholdProduct
                               |
                               +--< ShoppingList
                               |       |
                               |       +--< ShoppingListItem
                               |
                               +--< ShoppingTrip
                               |       |
                               |       +--< TripItem
                               |       +--< SubstitutionRequest
                               |
                               +--< Purchase
```

## 2. User

Fields:

- id;
- email;
- password_hash;
- display_name;
- created_at;
- updated_at;
- status.

## 3. Household

Fields:

- id;
- name;
- created_by_user_id;
- created_at;
- updated_at.

## 4. HouseholdMembership

Fields:

- id;
- household_id;
- user_id;
- role;
- created_at.

Constraints:

- unique(household_id, user_id);
- role in owner/member.

## 5. HouseholdInvitation

Fields:

- id;
- household_id;
- invited_email;
- token_hash;
- status;
- expires_at;
- invited_by_user_id;
- accepted_by_user_id;
- accepted_at;
- created_at.

## 6. ProductCategory

For MVP, categories may be seeded system data.

Fields:

- id;
- slug;
- display_name;
- sort_order;
- is_system.

## 7. HouseholdProduct

Fields:

- id;
- household_id;
- name;
- brand;
- variant;
- size_value;
- size_unit;
- usual_quantity;
- category_id;
- notes;
- primary_image_key;
- created_by_user_id;
- created_at;
- updated_at;
- archived_at.

Recommended normalized searchable name fields may be added later.

## 8. ProductSubstitute

Fields:

- id;
- household_id;
- product_id;
- substitute_product_id nullable;
- substitute_name nullable;
- preference_rank;
- notes;
- created_at.

A substitute may reference another household product or be represented as structured text.

## 9. ShoppingList

Fields:

- id;
- household_id;
- name;
- status;
- version;
- created_by_user_id;
- created_at;
- updated_at;
- archived_at.

Statuses:

- active;
- archived.

## 10. ShoppingListItem

Fields:

- id;
- household_id;
- shopping_list_id;
- household_product_id nullable;
- name_snapshot;
- brand_snapshot;
- variant_snapshot;
- size_value_snapshot;
- size_unit_snapshot;
- requested_quantity;
- category_id nullable;
- notes;
- position;
- created_by_user_id;
- created_at;
- updated_at.

Reason for snapshot fields:

A later edit to HouseholdProduct must not silently change the historical meaning of a list item.

## 11. ShoppingTrip

Fields:

- id;
- household_id;
- shopping_list_id;
- started_by_user_id;
- store_name nullable;
- status;
- started_at;
- completed_at nullable;
- created_at.

Statuses:

- active;
- completed;
- cancelled.

## 12. TripItem

TripItem captures the mutable shopping execution state.

Fields:

- id;
- household_id;
- shopping_trip_id;
- shopping_list_item_id;
- status;
- collected_by_user_id nullable;
- collected_at nullable;
- purchased_quantity nullable;
- unit_price nullable;
- purchased_name_snapshot nullable;
- purchased_brand_snapshot nullable;
- purchased_variant_snapshot nullable;
- purchased_size_value_snapshot nullable;
- purchased_size_unit_snapshot nullable;
- substituted boolean;
- created_at;
- updated_at.

Statuses:

- pending;
- collected;
- skipped.

## 13. SubstitutionRequest

Fields:

- id;
- household_id;
- shopping_trip_id;
- trip_item_id;
- requested_by_user_id;
- proposed_product_id nullable;
- proposed_name;
- proposed_brand nullable;
- proposed_variant nullable;
- proposed_size_value nullable;
- proposed_size_unit nullable;
- image_key nullable;
- status;
- resolved_by_user_id nullable;
- resolved_at nullable;
- created_at.

Statuses:

- pending;
- approved;
- rejected;
- cancelled.

## 14. Purchase

Purchase is historical and should be treated as append-oriented.

Fields:

- id;
- household_id;
- shopping_trip_id;
- trip_item_id;
- household_product_id nullable;
- requested_name_snapshot;
- requested_brand_snapshot;
- requested_variant_snapshot;
- requested_size_value_snapshot;
- requested_size_unit_snapshot;
- purchased_name_snapshot;
- purchased_brand_snapshot;
- purchased_variant_snapshot;
- purchased_size_value_snapshot;
- purchased_size_unit_snapshot;
- requested_quantity;
- purchased_quantity;
- unit_price nullable;
- total_price nullable;
- substituted;
- purchased_by_user_id;
- purchased_at;
- created_at.

## 15. DevicePushToken

Fields:

- id;
- user_id;
- token;
- platform;
- last_seen_at;
- revoked_at;
- created_at.

## 16. Household Isolation

Every household-owned aggregate should carry household_id where practical.

Queries should prefer:

```python
get_resource(
    household_id=current_household_id,
    resource_id=resource_id,
)
```

rather than unscoped ID lookups.

## 17. Future Tables

Not part of MVP:

- Receipt;
- ReceiptItem;
- Store;
- ProductPriceObservation;
- RestockPrediction;
- HouseholdInventory;
- BarcodeReference.
