# Codex Implementation Plan

## Working Principle

Each unit should be implemented, tested, and committed independently.

Codex must not redesign domain boundaries established in the architecture documents without explicit approval.

## Unit 0 — Repository Baseline

Deliver:

- monorepo layout;
- Expo React Native app;
- FastAPI backend;
- PostgreSQL local development;
- Docker Compose;
- environment validation;
- Alembic baseline;
- linting;
- formatting;
- test frameworks;
- CI;
- README.

Acceptance:

- backend boots;
- mobile app boots;
- DB migration reaches head;
- health endpoints pass;
- CI is green.

## Unit 1 — Authentication

Deliver:

- User model;
- registration;
- login;
- access token;
- refresh session/token;
- logout;
- GET /me;
- secure mobile token handling;
- auth screens.

Security:

- modern password hashing;
- refresh revocation;
- no tokens in logs.

Acceptance:

- full auth lifecycle tested.

## Unit 2 — Households and Membership

Deliver:

- Household;
- HouseholdMembership;
- HouseholdInvitation;
- household CRUD;
- invitation flow;
- household switcher;
- authorization boundary.

Acceptance:

- user can create/join household;
- cross-household access tests fail closed.

## Unit 3 — Household Product Catalogue

Deliver:

- ProductCategory;
- HouseholdProduct;
- product CRUD;
- structured product attributes;
- search/filter;
- product image abstraction;
- ProductSubstitute;
- mobile product screens.

Acceptance:

- household product can be created, edited, archived, searched, and added with image metadata.

## Unit 4 — Shopping Lists

Deliver:

- ShoppingList;
- ShoppingListItem;
- list CRUD;
- product-backed items;
- ad-hoc items;
- snapshot fields;
- quantity editing;
- mobile lists screens.

Acceptance:

- list remains understandable if source product changes later.

## Unit 5 — Realtime Collaboration

Deliver:

- authenticated WebSocket;
- list subscriptions;
- event envelope;
- list versioning;
- in-process publisher;
- client cache integration;
- reconnect/refetch handling.

Acceptance:

- second client receives committed list changes;
- unauthorized subscription denied;
- version-gap recovery tested.

## Unit 6 — Shopping Trips

Deliver:

- ShoppingTrip;
- TripItem;
- start trip;
- shopping mode;
- collect;
- undo;
- skip;
- optional store name.

Acceptance:

- trip state transitions are valid and transactional.

## Unit 7 — Substitutions

Deliver:

- SubstitutionRequest;
- preferred substitute display;
- create request;
- approve;
- reject;
- optional image;
- realtime updates;
- mobile approval UI.

Acceptance:

- substitution decision correctly updates active trip state.

## Unit 8 — Trip Completion and Purchases

Deliver:

- Purchase model;
- completion transaction;
- historical snapshots;
- duplicate-completion guard;
- purchase history screens.

Acceptance:

- completing a trip creates durable purchase history exactly once.

## Unit 9 — Household Purchasing Memory

Deliver:

- recent products;
- frequent products;
- last-purchased display;
- buy-again workflow;
- product purchase history.

Acceptance:

- previous purchase data can rapidly rebuild a new list.

## Unit 10 — Push Notifications

Deliver:

- device push token registration;
- notification abstraction;
- Expo implementation;
- item-added-during-trip notification;
- substitution notifications;
- trip-complete notification.

Acceptance:

- notification failure never rolls back committed domain state.

## Unit 11 — Production Readiness

Deliver:

- S3-compatible production storage;
- production DB configuration;
- readiness/liveness;
- structured logging;
- rate limiting;
- error tracking integration hooks;
- deployment documentation;
- backup/restore runbook;
- staging configuration;
- security review.

Acceptance:

- staging deployment passes smoke tests;
- migration process documented;
- restore procedure documented.

## Definition of Done per Unit

Every unit must include:

1. implementation;
2. migrations where required;
3. tests;
4. documentation updates;
5. no unrelated refactors;
6. final changed-files summary;
7. test results;
8. known limitations;
9. explicit confirmation that deferred scope was not implemented.

## Codex Guardrails

Codex should:

- preserve household isolation;
- prefer scoped repository methods;
- maintain product/list/purchase separation;
- publish realtime only after DB commit;
- avoid introducing Redis early;
- avoid introducing microservices;
- avoid adding AI features;
- avoid exact inventory counts in MVP;
- avoid retailer APIs unless separately approved;
- avoid shared household login credentials.
