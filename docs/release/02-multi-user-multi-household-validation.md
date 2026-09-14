# Release Readiness Unit 2 — Multi-User and Multi-Household Validation

Date: 2026-09-14  
Status: **MULTI-USER VALIDATED WITH LIMITATIONS**

## Baseline

- Starting HEAD: `1b5a3cc docs: record completed native build validation`
- Native build baseline: EAS development build `cfbe96cf-9ba7-4064-a9fb-220e8a3e3390`, package `com.example.householdshopping`.
- Preserved unrelated dirty files: `.env.example`, `apps/mobile/expo-env.d.ts`, `apps/mobile/src/design/components.test.tsx`, `apps/mobile/src/design/components.tsx`, `apps/mobile/src/screens/list-detail-screen.tsx`, and untracked `apps/mobile/.gitignore`.
- Backend topology: local Docker Compose API on `127.0.0.1:8000` with PostgreSQL; isolated integration database `appshop_test` was used for the backend suite.

## Test topology

The native development build was used for the primary authenticated emulator session (`emulator-5554`). A separate Python `httpx` + `websockets` client supplied an independent User B session; it did not reuse User A's token or local storage. This is representative for auth, authorization, tenant isolation, and realtime protocol behavior, but it is not a second rendered mobile UI.

- User A: unique `rr2-owner-<run>@example.com`, Owner of Household Alpha and Household Beta.
- User B: unique `rr2-member-<run>@example.com`, Member of Household Alpha only.
- Household Alpha: `RR2 Alpha`.
- Household Beta: `RR2 Beta`.
- Recognisable records: `Alpha Grocery`, `Beta Grocery`, `Alpha Milk`, `Beta Milk`, `RR2 Market`.

Credentials, tokens, and full email addresses are intentionally omitted.

## Authorization and invitations

- Two separate accounts registered and authenticated successfully.
- User A created Alpha and Beta and received the owner role.
- User A invited User B; User B accepted the invitation token. Membership was created exactly once and User B appeared as `member`.
- User A's household list contained Alpha and Beta. User B's list contained Alpha only.
- Members API reported User A as `owner` and User B as `member`.
- User B's owner-only rename attempt was rejected (`403`/`404` protected behavior).
- Duplicate pending invitation was rejected with `409`.
- User B's cross-household access to Beta was rejected.

## Tenant isolation and IDOR checks

- Alpha and Beta lists were created separately; each household list endpoint returned only its own list.
- Alpha and Beta products were created separately; catalogue endpoints returned only the current household's product.
- User B could not access Beta resources.
- A same-user request using an Alpha list ID under Beta initially produced an internal `500`. This was fixed so the route now returns `404 SHOPPING_LIST_NOT_FOUND` without disclosing the resource.
- Realtime subscription to a list outside User B's household returned `REALTIME_SUBSCRIPTION_DENIED`.
- Members, history, preferred-substitute picker, Buy Again, and product search were not all manually rendered in both household contexts; existing household-scoped repository/API tests remain coverage for those paths.

## Collaboration and realtime

- Both independent sessions subscribed to the shared Alpha list.
- User A added an item; both WebSocket sessions received the shopping-list item update event without manual refresh.
- User B's attempt to subscribe to Beta's list was denied.
- The one-active-trip invariant was verified: User A started the Alpha trip and User B's second start attempt returned the existing-active-trip conflict (`409 SHOPPING_TRIP_ALREADY_ACTIVE`).
- User B collected a trip item through the API; the resulting trip state recorded the collected transition.

The following were not fully exercised with two rendered clients: list edit/remove propagation, trip collect/skip/undo propagation in both directions, active-trip live item addition, background/resume version-gap recovery, and trip completion propagation.

## Substitutions and attribution

- Backend and mobile automated tests cover substitution request lifecycle, self-approval rejection, approval/rejection state, stale/non-pending resolution, notification recipient selection, and canonical navigation state.
- A complete User A → User B request/approve/reject flow was not manually completed in two live UI sessions during this run.
- Replacement purchase snapshot integrity, requester/resolver identity, and household Purchasing Memory across both users were not manually verified after trip completion.
- No authorization bypass or self-approval defect was found in the existing backend tests.

## Defect found and fixed

**P1 tenant-boundary reliability defect (fixed).** `GET /households/{beta}/shopping-lists/{alpha-list}` passed household access but formatted a missing list as though it existed, causing a `500`. The route now raises the existing protected `404 SHOPPING_LIST_NOT_FOUND` error. A PostgreSQL regression test covers same-user cross-household list IDs; the focused shopping-list suite passes 4/4.

No cross-household data leak, authentication bypass, or unauthorized mutation was observed. No new roles, tenancy model, or product features were added.

## Automated validation

Mobile (`apps/mobile`):

- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm test -- --watch=false` — 14 suites, 42 tests passed

Backend:

- Non-PostgreSQL suite — 13 passed, 43 skipped when no test database was selected.
- Full isolated PostgreSQL suite after the fix — 56 passed; the first post-fix run had one assertion-only failure in the newly added regression test, which was corrected.
- Focused `tests/test_shopping_lists_api.py` against `appshop_test` — 4 passed.

## Limitations

- Only one rendered Android development-build UI was available. User B used an independent API/WebSocket session, not a second emulator or physical device.
- Substitution approval/rejection, purchase snapshot/collector attribution, household-switch realtime unsubscribe/resubscribe, and full trip lifecycle propagation need a follow-up two-rendered-client pass.
- FCM credentials remain unconfigured, so push delivery itself was not attempted; backend recipient-selection tests remain the authoritative check.
- QA records were left in the local development database; no production-like database was modified.

## Readiness

**MULTI-USER VALIDATED WITH LIMITATIONS**

Core separate-account, invitation, owner/member, tenant-isolation, protected-ID, shared-list realtime, and active-trip invariant checks passed. The status remains limited because the second session was protocol-level rather than a second rendered client and several substitution, purchase-attribution, and full trip lifecycle checks remain outstanding.
