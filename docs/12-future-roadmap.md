# Future Roadmap

## Phase 2 — Restocking Suggestions

Goal:
Use purchase history to estimate when a household may need a product again.

Initial heuristic:

```text
expected_next_purchase =
last_purchase_date + average_purchase_interval
```

Possible later inputs:

- usual quantity;
- household size;
- seasonal patterns;
- manual "running low" signals;
- skipped purchases.

## Phase 3 — Receipt Capture

Capabilities:

- photograph receipt;
- OCR/extraction;
- match receipt rows to household products;
- confirm uncertain matches;
- update prices and history.

## Phase 4 — Price History

Store:

- product;
- retailer/store;
- observed price;
- quantity/size;
- timestamp;
- source.

Use cases:

- last known price;
- historical price trend;
- household spend estimation.

## Phase 5 — Store Comparison

If reliable catalogue or price data becomes available:

- compare likely basket costs;
- surface store-specific availability;
- suggest preferred shopping location.

This requires careful data-quality controls and retailer integration strategy.

## Phase 6 — Purchasing Intelligence

Potential capabilities:

- likely restock list;
- unusual purchase-frequency changes;
- household spending summaries;
- substitute recommendations;
- product preference learning;
- shopping trip preparation assistant.

AI should be introduced only where deterministic product history is insufficient.

## Separate Future Product — Small Business Procurement

Potential business edition:

- inventory quantities;
- reorder levels;
- supplier catalogue;
- purchase orders;
- receiving;
- stock movements;
- procurement approvals.

This is related to the household product technically, but it should be treated as a separate product surface rather than added casually to the consumer MVP.
