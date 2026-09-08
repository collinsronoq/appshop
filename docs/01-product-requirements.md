# Product Requirements

## 1. Purpose

This document defines the functional and non-functional requirements for the MVP.

## 2. Actors

### User
An authenticated person with an individual account.

### Household Owner
A user who created or owns a household and can manage membership.

### Household Member
A user who belongs to a household and can use household shopping features.

### Shopper
A household member who starts or participates in a shopping trip.

## 3. Functional Requirements

### FR-001 Authentication
The system must support:

- registration;
- login;
- access token renewal;
- logout;
- authenticated profile retrieval.

### FR-002 Household Creation
An authenticated user must be able to create a household.

Acceptance criteria:

- creator becomes owner;
- household has a stable identifier;
- owner can rename the household;
- all household-owned data is isolated by household.

### FR-003 Invitations
A household owner must be able to invite another person.

Acceptance criteria:

- invitations use opaque, expiring tokens;
- invitation status is tracked;
- accepted invitations create a membership;
- repeated acceptance is idempotent;
- invalid and expired invitations are rejected.

### FR-004 Membership
Users may belong to one or more households.

MVP roles:

- owner;
- member.

### FR-005 Household Products
Members must be able to create and manage reusable household product records.

A product may contain:

- name;
- brand;
- variant;
- size value;
- size unit;
- usual quantity;
- category;
- notes;
- image;
- preferred substitute.

### FR-006 Categories
Products may be grouped into system categories.

Initial categories:

- Produce
- Dairy
- Bakery
- Meat
- Pantry
- Beverages
- Frozen
- Household Cleaning
- Laundry
- Bathroom
- Personal Care
- Baby
- Pet
- Other

### FR-007 Shopping Lists
Members must be able to create, rename, archive, and view shopping lists.

A list contains list items and belongs to exactly one household.

### FR-008 Shopping List Items
A shopping list item may:

- reference a household product; or
- exist as an ad-hoc item.

A list item must store enough snapshot data to remain understandable even if the household product later changes.

### FR-009 Realtime Collaboration
When one member changes an active list, other connected members viewing the same list should receive the change without manual refresh.

Realtime event types must include:

- item added;
- item updated;
- item removed;
- item collected;
- item uncollected;
- item skipped;
- trip started;
- substitution requested;
- substitution approved;
- substitution rejected;
- trip completed.

### FR-010 Shopping Trip
A member must be able to start a shopping trip from a shopping list.

A shopping trip:

- belongs to one household;
- references its source list;
- records shopper identity;
- records optional store text;
- records start and completion timestamps.

### FR-011 Shopping Mode
During an active trip, members must be able to:

- mark an item collected;
- undo collection;
- skip an item;
- view exact product details;
- continue editing the source shopping list while the trip is active.

### FR-012 Substitutions
A shopper must be able to indicate that a requested product is unavailable.

Possible actions:

- use preferred substitute;
- request another substitute;
- ask household;
- skip.

A substitution request may include:

- requested item;
- proposed replacement text or product;
- optional image;
- status;
- requester;
- resolver;
- timestamps.

### FR-013 Complete Trip
A shopper must be able to complete a trip.

Completion must:

- freeze the trip into historical state;
- record collected items;
- preserve skipped items;
- preserve substitutions;
- create purchase records for collected items;
- prevent accidental duplicate completion.

### FR-014 Purchase History
Members must be able to view historical purchases.

Purchase records must capture:

- household;
- trip;
- product reference when available;
- requested product snapshot;
- purchased product snapshot;
- requested quantity;
- purchased quantity;
- optional price;
- substitution indicator;
- purchased timestamp;
- shopper.

### FR-015 Buy Again
The application should surface recently and frequently purchased household products for rapid re-adding to a shopping list.

### FR-016 Notifications
The system should support push notifications for high-value collaborative events, including:

- item added while another member is shopping;
- substitution request;
- substitution resolution;
- trip completion.

## 4. Non-Functional Requirements

### NFR-001 Security
Household resources must never be accessible solely by guessing identifiers.

### NFR-002 Performance
Typical list reads and writes should complete fast enough for an interactive mobile workflow.

### NFR-003 Realtime Recovery
Realtime delivery may be lossy, but state consistency must not depend on receiving every event.

### NFR-004 Mobile Usability
Shopping mode must use touch-friendly controls suitable for one-handed use.

### NFR-005 Resilience
Optimistic mutations should recover gracefully when connectivity is intermittent.

### NFR-006 Observability
The backend must expose structured logs and health endpoints.

### NFR-007 Data Integrity
Historical purchases must not be silently rewritten when a household product changes later.

## 5. MVP Success Criteria

The MVP is successful when a household can:

1. create a shared household;
2. save its usual products;
3. create and collaboratively update a shopping list;
4. shop using exact product details;
5. handle substitutions;
6. complete a trip;
7. view reusable purchase history;
8. quickly rebuild the next shopping list from prior purchases.
