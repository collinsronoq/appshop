# AppShop mobile redesign coverage

Checked on 2026-09-21 against the Expo Router tree in `apps/mobile/app` and the shared screens in `apps/mobile/src/screens`.

## Entry and authentication

- [x] `/` — unauthenticated welcome, authenticated redirect, session-loading state
- [x] `/login` — labelled email/password form, visibility control, inline error, submitting state, invitation redirect preservation
- [x] `/register` — labelled name/email/password form, visibility control, inline error, submitting state, invitation redirect preservation
- [x] `/invitation/[token]` — loading, unauthenticated handoff, accept, already resolved/error outcomes

## Household and onboarding

- [x] Empty-household onboarding / creation
- [x] `/households` — household selection and current state
- [x] `/household-settings` — rename form and errors
- [x] `/members` — member list, roles, current user, empty/error/loading
- [x] `/invite` — invitation form, validation, success, error

## Primary tabs

- [x] Home — household identity, imagery, active trip, relevant lists, attention, Buy Again, quick actions, empty/loading/error states
- [x] Lists — active lists, archived lists, active-trip progress, empty/loading/error states
- [x] Products — search, category filter, active/archived filter, truthful image fallback hierarchy, empty/loading/error states
- [x] History — recent purchases, Purchase History destination, Buy Again destination, singular/plural copy
- [x] Profile — account identity, household summary, members/invite/switch/rename, notifications, logout

## Lists and trips

- [x] `/lists/new` — keyboard-safe creation form
- [x] `/lists/[id]` — details, item actions, rename sheet, archive restrictions, loading/error/empty states
- [x] `/lists/[id]/add` — product search, one-off item, quantity/notes form, duplicate error
- [x] `/lists/[id]/start` — optional store form and start error
- [x] `/trip/[tripId]` — canonical progress, compact item imagery, collect/skip/undo/unavailable actions, complete/cancel confirmation, substitution result
- [x] `/trip/[tripId]/items/[tripItemId]/unavailable` — preferred, catalogue, custom, review, waiting and error states

## Products and substitutions

- [x] `/products/new` — compact optional photo picker, complete keyboard-safe form
- [x] `/products/edit` — existing image, update, upload-warning behavior
- [x] `/products/[id]` — uploaded/local/category/neutral image precedence, metadata, substitute, summary, archive
- [x] `/products/[id]/history` — grouped purchase history and empty/loading/error states
- [x] `/substitutions` — actionable pending approvals and empty/loading/error states
- [x] `/substitutions/[id]` — original-versus-proposed comparison, self-approval restriction, approved/rejected/waiting states

## History, Buy Again, settings, and shared states

- [x] `/purchases` — grouped history and product destinations
- [x] `/purchasing-memory` — user-facing Buy Again labels, recent/frequent items, list selection, duplicate/error handling
- [x] `/notifications` — permission, unavailable, enabled/disabled and error states
- [x] Shared top bars, five-tab navigation, safe areas and nested headers
- [x] Shared buttons, fields, icon buttons, cards, progress, loading skeletons, inline errors, empty states, sheets and confirmation dialogs
- [x] Shared keyboard-aware scrolling used by authentication, household, product, list, invitation and substitution forms

## Data and behavior guardrails

- [x] No backend schema or API contract changes
- [x] No fake household data, products, purchases, trips, members or avatars
- [x] Uploaded product images retain first precedence
- [x] Demonstration imagery is locally bundled and conservatively matched
- [x] Trip progress continues to use canonical trip progress data
- [x] Realtime, query invalidation, permissions, notification links and lifecycle mutations remain intact

