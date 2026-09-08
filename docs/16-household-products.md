# Unit 3 — Household product catalogue

The catalogue stores household-scoped products with structured brand, variant, size, quantity, notes, category, archive timestamp, and primary image metadata. Product names are not unique. Lists omit archived products unless `archived=true`, and search matches name, brand, or variant case-insensitively with deterministic ordering.

System categories are seeded by migration `0004_household_products`. Product and substitute access always requires Unit 2 household membership. Substitutes can reference another product in the same household or use free text; self-references and cross-household references are rejected.

Images use provider-neutral storage with local filesystem support (`STORAGE_BACKEND=local`, `LOCAL_STORAGE_ROOT`). Uploads accept JPEG, PNG, and WebP up to 5 MB. Only a generated key is stored; responses derive an application URL. Full S3 signing and camera capture remain deferred.

Mobile product queries include the selected household ID in every key, with search, empty state, create flow, and household switching support. Shopping lists, trips, purchases, realtime sync, OCR, and inventory remain out of scope.
