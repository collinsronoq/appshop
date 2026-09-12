# UI Unit 8 — Visual System and Cross-App Refinement

## Android audit

Reviewed at 720 × 1280 through `emulator-5554`. The baseline showed an oversized Product Detail media area, tall catalogue and purchase cards, split metadata, truncated purchasing-memory copy, excessive section rhythm, a leading separator in Shopping Mode metadata, large resolved-trip cards, and an off-system Start Shopping form. Members also needed separation between its list and primary action.

Home, Lists, List Detail, Products, Product Detail, History, Purchase History, Purchasing Memory, Profile, Members, Start Shopping, Shopping Mode, Add Product, Create List, and Invite Member were reviewed in the Android emulator. Create List, Add Product, and Invite Member were also focused with the Android IME active.

## System refinements

- Kept the 4/8/12/16/20/24/32 spacing scale and standardized the primary 20dp screen gutter.
- Tightened shared top-level and nested header spacing while retaining 44–48dp touch targets.
- Reduced section gaps and card density without changing the warm cream, forest, sage, and white visual identity.
- Preserved filled primary, outlined secondary, quiet tertiary, and red destructive action hierarchy.
- Consolidated product, list, trip, and purchase metadata so values and units remain together and long content can shrink or truncate safely.
- Reduced Product Detail media height and brought its primary action into the first small-screen viewport.
- Integrated Buy Again into the memory-card header so supporting copy retains the full card width.
- Rebuilt Start Shopping with the shared screen, header, card, input, feedback, and button primitives.
- Vertical scroll indicators remain disabled by the shared `AppScreen` primitive.

## Defects and resilience

- Shared number formatting removes insignificant trailing zeroes while retaining meaningful decimals.
- The previous Product Detail raw whitespace child was removed; no raw-text rendering exception appeared during the emulator route pass.
- Shopping Mode no longer renders a leading separator when brand, variant, and size are absent.
- Long names and metadata use constrained copy regions, `numberOfLines`, and shrink-safe flex layouts.
- Content remains above the tab/navigation areas, and keyboard-focused forms remain scrollable.

## Remaining UI debt

- Native alert dialogs still use platform-default visual treatment.
- Category controls now expose a visible selected state and an accessibility-selected state; a generic shared chip primitive can still be extracted if more forms adopt the pattern.
- Expo Go’s development gear overlays the app in screenshots; it is tooling and was intentionally ignored.

No backend, authentication, household, list, trip, substitution, purchase, realtime, or push-notification semantics changed.
