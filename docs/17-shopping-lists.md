# Unit 4 — Shopping lists

Shopping lists represent household planning intent. They are household-scoped, start at version 1, and increment on rename, add/update/remove item, and archive mutations using a row lock and SQL expression.

List items support either a household-product reference or an ad-hoc name. Product-backed items copy name, brand, variant, size, and category into scalar snapshot columns when added; later product edits do not change the request. Archived products cannot be newly added, but existing snapshots remain readable. Duplicate product additions return `SHOPPING_LIST_PRODUCT_ALREADY_PRESENT`.

Lists archive rather than hard-delete. Archived lists are omitted by default and reject normal item mutations. Item removal is currently a hard delete because shopping-trip history is not yet implemented. Mobile list query keys always include the selected household ID.

Shopping trips, collected state, realtime synchronization, notifications, purchases, and restocking remain future units.
