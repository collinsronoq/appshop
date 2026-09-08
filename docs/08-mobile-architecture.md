# Mobile Architecture

## 1. Stack

- React Native
- Expo
- TypeScript
- Expo Router
- TanStack Query
- React Hook Form
- Zod
- Expo SecureStore
- Expo Notifications
- Expo Image Picker / Camera capability as needed

## 2. Navigation

Suggested root:

```text
(auth)
  login
  register

(app)
  household-select
  (tabs)
    home
    lists
    products
    you

  list/[listId]
  trip/[tripId]
  product/[productId]
  invitation/[token]
```

## 3. Bottom Navigation

Primary tabs:

- Home
- Lists
- Products
- You

## 4. Home

Home should prioritize current activity.

Sections:

- active shopping trip;
- active shopping list;
- quick add;
- buy again;
- recent purchases.

## 5. Lists

Show:

- active lists;
- archived lists;
- prior trips where appropriate.

## 6. Products

Show household catalogue with:

- search;
- category filter;
- image;
- brand/variant/size;
- add-to-list shortcut.

## 7. Shopping Mode

Shopping mode is a dedicated screen optimized for:

- one-handed use;
- large touch targets;
- low visual clutter;
- category grouping;
- instant collect/undo;
- exact product detail access;
- unavailable/substitution workflow.

## 8. Server State

TanStack Query owns server state.

Examples:

- current user;
- households;
- products;
- shopping lists;
- active trip;
- purchases.

Do not duplicate this state into a global store.

## 9. Local State

Use component state for:

- open sheets;
- temporary form state;
- filters;
- local UI preferences.

Introduce Zustand only if a concrete cross-screen local-state problem appears.

## 10. Forms

Use React Hook Form + Zod.

The client schema should align with generated backend types where practical.

## 11. Auth Storage

Refresh credential should be stored in secure device storage.

Avoid AsyncStorage for sensitive tokens.

## 12. Optimistic Updates

Recommended for:

- collect;
- uncollect;
- skip;
- quantity changes;
- simple list additions.

Each optimistic mutation must have rollback/refetch behavior.

## 13. Realtime Integration

WebSocket events should invalidate or patch TanStack Query cache.

If a version gap is detected, refetch canonical state.

## 14. Offline Behavior

MVP target:

- cached reads;
- optimistic UI;
- mutation retry;
- clear sync failure indicator.

Full offline-first conflict resolution is not an MVP requirement.

## 15. Accessibility

Requirements:

- sufficient touch size;
- semantic labels;
- screen-reader labels;
- contrast-compliant text;
- do not communicate collected/skipped state using color alone.
