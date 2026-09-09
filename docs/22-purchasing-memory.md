# Household purchasing memory

Purchasing memory is derived from canonical `Purchase` rows using SQL aggregation. Recent and
frequent results group only catalogue-backed purchases by `household_product_id`; ad-hoc purchases
are not fuzzy-merged. Cards use current HouseholdProduct metadata, while purchase history remains
immutable snapshots. Archived products remain visible but cannot be bought again through normal
product rules. Counts, latest purchase time, and quantity totals are descriptive only—no cadence,
restocking, recommendations, or AI are calculated.
