# UI Unit 3 — Product Catalogue

Products now reads as the household’s reusable catalogue rather than a CRUD form:

- Catalogue root supports household-scoped search across name/brand/variant, backend-provided category chips, active/archived filtering, compact image-aware cards, and clear empty/error states.
- Add and edit share `ProductForm`, including consumer-friendly size, category, quantity stepper, notes, validation, and save loading states.
- Product detail presents image/placeholder, identity hierarchy, category, usual quantity, notes, preferred substitute preview, purchase summary, archive confirmation, and add-to-list routing.

The implementation uses the existing product, category, substitute, purchase-summary, and archive APIs without changing backend contracts or the authenticated shell.
