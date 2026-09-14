# UI Unit 9 — Mobile Release Candidate QA

## Environment

- QA window: 2026-09-12 to 2026-09-14
- Starting commit: `d28423a refactor: polish mobile visual system`
- Device: Android emulator `emulator-5554`
- Viewport: 720 × 1280 at 320 dpi
- Runtime: Expo Go, Expo SDK 57
- Mobile API base URL: `http://10.0.2.2:8000/api/v1`
- Backend health endpoint returned HTTP 200 and PostgreSQL was healthy.
- Pre-existing working-tree files preserved and excluded from this unit: `.env.example`, `apps/mobile/expo-env.d.ts`, and `apps/mobile/.gitignore`.

## Flows exercised

| Domain | Result | Emulator coverage |
| --- | --- | --- |
| Authentication | PASS | Invalid login, registration, successful login, logout/login, token restoration, and final cold start. |
| Households | PASS WITH LIMITATION | New-household bootstrap created owner membership and selected `RC Household`. Current-household restoration passed. The QA account had only one membership, so cross-household cache isolation was not manually exercised. |
| Members and invitations | PASS WITH LIMITATION | Owner-only Members and Invite Member actions appeared. Valid invitation succeeded; retrying the same address remained idempotent with one pending record. Invalid-email UX was fixed. Ordinary-member visibility was not manually exercised. |
| Products | PASS WITH LIMITATION | Create, detail, edit, natural number formatting, name/brand search, category filtering, empty filtered state, archive confirmation, active removal, archived display, list exclusion, and accessible filter/input states. Image picking and preferred-substitute management were not exposed/exercised in this environment. |
| Shopping lists | PASS | Create, empty transition, catalogue item, custom item, product snapshots, duplicate conflict, edit quantity/notes, remove, rename, counts, and back navigation. |
| Shopping trips | PASS | Start, store name, collect, undo, skip, readiness gating, live list addition, completion confirmation, completion, active-state clearing, and purchase creation. |
| Substitutions | PASS WITH LIMITATION | Custom replacement request, waiting state, duplicate pending-request error, and requester self-approval hiding passed. A second user, approve/reject, stale resolution, and preferred-substitute path were not manually exercised. |
| Purchase history | PASS | Completion produced purchases for collected catalogue and custom items; the skipped item produced none. Date grouping, quantities, identity, and product-history navigation passed. Product history retained the purchased `RC Milk Updated` snapshot after the current product was renamed to `RC Milk Current`. |
| Purchasing memory | PASS | Recently Purchased, Frequently Bought, last purchase, count, usual quantity, successful Buy Again, duplicate handling, and archived-product state passed. Archived products show `Archived` instead of Buy Again. |
| Profile | PASS WITH LIMITATION | Identity, household, owner role, Members, Invite Member, Switch Household entry, Notifications, and Logout passed. A second household and ordinary-member account were unavailable for manual role/switch comparison. |
| Notifications | PASS WITH LIMITATION | Expo Go now reports `Requires a development build` and disables registration cleanly. Real permission/register/unregister and remote delivery were not manually exercised; existing automated lifecycle, cleanup, and deep-link tests passed. |

Representative forms were exercised with the keyboard on the 720 × 1280 emulator. Buttons remained reachable after keyboard dismissal, content did not overflow horizontally, and primary navigation remained above the Android navigation area. Filtered `adb logcat` output contained no app-related React Native errors, fatal exceptions, unhandled promise rejections, key warnings, raw-text errors, or navigation warnings after the fixes.

## Defects found and fixed

| Severity | Route / flow | Reproduction and actual result | Cause | Fix and verification |
| --- | --- | --- | --- | --- |
| P2 | Products → Archived | Enable Archived; active products were shown beneath the `Archived products` heading. | Backend `archived=true` intentionally includes active and archived records, while the mobile view treated the response as archived-only. | The client now filters that response to records with `archived_at`. Emulator recheck showed only `RC Milk Current`; a focused API-client test covers the contract. |
| P2 | Profile → Invite Member | Submit `not-an-email`; the screen showed `Couldn't load this section.` | No local email validation and the shared inline error had fixed generic copy. | Added lightweight email validation and message-aware inline errors. Emulator recheck showed `Enter a valid email address.` |
| P2 | Profile → Notifications in Expo Go | The screen said a development build was required but still offered Enable; tapping it showed the generic section error. | The unavailable state reused the normal action and the shared error discarded its supplied context. | The unavailable state now shows a disabled `Enable in a development build` action; contextual errors render their message. Emulator recheck confirmed the button is disabled. |
| P2 | Products filters | Selected category and archive state were visual only in Android accessibility hierarchy. | Filter pressables did not provide roles/states. | Category chips expose `selected`; the archive control exposes switch `checked`; Clear Search exposes button semantics. Verified through `uiautomator`. |
| P2 | Product create/edit form | Visible labels were absent from Android input accessibility descriptions. | The shared product `Field` did not pass a label to `TextInput`. | Product inputs derive an accessibility label from their visible label. Verified for Name, Brand, Variant, Size, and Unit. |

No P0 or P1 defects were found. No backend code or database migration was changed.

## Test data and purchase verification

- QA account: `rc.qa.20260912@example.com`
- Household: `RC Household`
- Lists: `RC Grocery Updated`, `RC Repeat`
- Product lifecycle: `RC Milk` → `RC Milk Updated` → `RC Milk Current` → archived
- Custom items: `RC Custom Item` (skipped), `RC Live Add` (collected)
- Store: `RC Market`
- Replacement request: `RC Milk Substitute`
- Purchase History contained `RC Milk Updated` quantity 2 and `RC Live Add` quantity 1. It did not contain skipped `RC Custom Item`.

## Automated validation

Run from `apps/mobile`:

- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm test -- --watch=false` — PASS, 13 suites and 33 tests
- Focused `npm test -- --watch=false src/products/api-client.test.ts` — PASS
- Backend suite — not run because no backend code changed

## Areas not fully testable

- Real Expo push permission, token registration/unregistration, delivery, and notification navigation require a development build and push infrastructure.
- Product image picking/upload was not exercised in Expo Go.
- Two-user substitution approval/rejection, stale-resolution recovery, and two-device realtime were not manually exercised.
- Preferred-substitute management was not exposed by the current product UI/data.
- Cross-household cache isolation and ordinary-member visibility were not manually exercised because the QA account had one household and one owner membership.
- Physical-device-only behavior was not exercised.

The relevant automated tests continue to cover push lifecycle/deep-link state, auth, household API, trips, lists, memory, realtime versioning, navigation, and logout cleanup.

## Release assessment

Known release blockers: none.

Known non-blocking limitations are the environment- and second-user-dependent flows listed above.

**RC READY WITH KNOWN LIMITATIONS**

The core Android flows are coherent end-to-end, no P0/P1 defect remains, the confirmed P2 defects were fixed and rechecked on the emulator, and all mobile automated validation passes. The remaining gaps require a development build, physical device, second account/device, or currently unexposed UI.
