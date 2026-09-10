# UI Unit 6 — Purchase History and Purchasing Memory

History now separates immutable purchase facts from derived household memory:

- History landing presents Purchase History and Purchasing Memory as purposeful cards with a recent activity preview.
- Purchase History groups compact snapshot-based purchase rows by local date and links rows with a product identity to Product Detail. Substituted purchases foreground the purchased snapshot and retain the requested item as context.
- Purchasing Memory presents Recently Purchased and Frequently Bought cards using current household-product identity, with last-bought/purchase-count context, archived state, and Buy Again list selection.
- Product purchase history is available at `/products/[id]/history` and preserves historical snapshot size, quantity, and names.

All cache keys remain household-scoped. Existing purchase, memory, list, and product APIs are reused without changing domain semantics.
