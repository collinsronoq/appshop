# UI Unit 8 — Visual System and Cross-App Refinement

- Tightened the shared typography hierarchy, section rhythm, quick actions, standard buttons, and compact-button treatment while retaining the warm cream/forest/sage visual identity.
- Added shared number, quantity, and size formatting so API decimal values render naturally without insignificant trailing zeros.
- Removed the Product Detail raw whitespace child that could trigger React Native’s “Text strings must be rendered within a `<Text>` component” error and audited touched JSX for similar text nodes.
- Refined Product Detail media density and action hierarchy, compacted purchase and purchasing-memory rows, improved catalogue/list metadata truncation, and replaced the History orphan preview text with reusable purchase rows.
- Standardized page gutters and headers through existing `AppScreen`, `AppHeader`, and `BackHeader`; vertical scroll indicators remain disabled by the shared screen primitive.
- Added explicit compact and tertiary action variants so secondary navigation and archive actions do not compete with primary tasks.

No backend, authentication, household, list, trip, substitution, purchase, realtime, or push semantics changed.
