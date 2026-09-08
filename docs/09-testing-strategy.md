# Testing Strategy

## 1. Objectives

Tests must protect:

- household isolation;
- authentication;
- domain integrity;
- trip completion;
- historical purchase accuracy;
- realtime recovery;
- critical mobile workflows.

## 2. Backend Unit Tests

Cover:

- invitation token logic;
- product snapshot generation;
- list version increments;
- trip-state transitions;
- substitution-state transitions;
- purchase generation;
- authorization helpers.

## 3. Backend Integration Tests

Use PostgreSQL-backed integration tests for:

- migrations;
- relational constraints;
- household isolation;
- transactional trip completion;
- duplicate completion protection;
- invitation acceptance;
- scoped resource lookup.

## 4. API Tests

Cover main endpoint contracts:

- auth;
- household;
- products;
- lists;
- trips;
- substitutions;
- purchases.

Include negative cases:

- unauthenticated;
- wrong household;
- wrong role;
- invalid state transition;
- stale/missing resource.

## 5. Realtime Tests

Verify:

- unauthorized subscription rejected;
- event emitted after successful commit;
- no event on rolled-back transaction;
- list version increments;
- client can detect version gap.

## 6. Mobile Component Tests

Cover:

- product forms;
- list item rendering;
- shopping-mode state;
- substitution request UI;
- sync failure presentation.

## 7. End-to-End Tests

Critical flows:

### E2E-001
Register -> create household -> create product -> create list -> add product.

### E2E-002
Two users join same household -> user A adds item -> user B sees update.

### E2E-003
Start trip -> collect items -> substitute one -> complete -> history exists.

### E2E-004
User from Household A cannot access Household B resource by ID.

## 8. Migration Testing

Every migration should be tested from prior head to current head against PostgreSQL.

## 9. CI Quality Gates

CI should run:

- backend lint;
- backend type/static checks where configured;
- backend unit/integration tests;
- frontend lint;
- TypeScript check;
- mobile tests;
- migration-head validation;
- dependency/security checks.

## 10. Test Data

Use deterministic factories.

Do not rely on shared persistent test accounts.
