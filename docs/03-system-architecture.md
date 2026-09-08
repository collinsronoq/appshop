# System Architecture

## 1. Architectural Style

The MVP uses a modular monolith.

No microservices are required.

```text
React Native / Expo
        |
   HTTPS / WebSocket
        |
      FastAPI
   /      |       \
Postgres  Object   Push
          Storage  Notifications
```

## 2. Client

Technology:

- React Native;
- Expo;
- TypeScript;
- Expo Router;
- TanStack Query;
- React Hook Form;
- Zod.

Responsibilities:

- navigation;
- forms;
- optimistic interactions;
- server-state caching;
- local presentation state;
- secure auth token storage;
- WebSocket subscription;
- push token registration.

## 3. Backend

Technology:

- Python;
- FastAPI;
- SQLAlchemy 2 async;
- Pydantic;
- Alembic;
- PostgreSQL.

Responsibilities:

- authentication;
- household authorization;
- domain validation;
- relational persistence;
- transaction boundaries;
- realtime event publication;
- notification dispatch;
- OpenAPI contract.

## 4. Database

PostgreSQL is the source of truth.

Strong relational constraints should be preferred over application-only invariants where practical.

## 5. Object Storage

Product and substitution images are stored in S3-compatible object storage.

Database records store object keys and metadata, not image bytes.

## 6. Realtime

MVP:

```text
Client
  |
WebSocket
  |
FastAPI connection manager
```

Each active list has a logical channel:

```text
shopping-list:{list_id}
```

Realtime events notify clients that committed state changed.

Realtime events are not the source of truth.

Future scale:

```text
FastAPI A ----\
FastAPI B ----- Redis Pub/Sub
FastAPI C ----/
```

The event publisher should therefore be hidden behind an interface.

## 7. Notifications

Expo Push Notifications are used for asynchronous mobile notifications.

Push is not used for realtime synchronization.

## 8. Deployment Shape

Initial production shape:

```text
Mobile clients
      |
 HTTPS
      |
API service
 |    |    |
DB   S3   Push Provider
```

Recommended runtime components:

- one API service;
- managed PostgreSQL;
- S3-compatible storage;
- reverse proxy / managed ingress;
- monitoring and log aggregation.

## 9. Architectural Boundaries

Primary backend modules:

- auth;
- households;
- products;
- shopping_lists;
- shopping_trips;
- substitutions;
- purchases;
- notifications;
- realtime.

## 10. Transaction Rules

Domain mutations should complete database work before publishing realtime events.

Pattern:

1. validate;
2. write transaction;
3. commit;
4. publish event;
5. optionally send push notification.

If event publication fails after commit, the database remains authoritative and clients recover through refetch.

## 11. API Versioning

Expose API under:

```text
/api/v1
```

Breaking contract changes require a version transition.

## 12. OpenAPI

FastAPI OpenAPI is the canonical HTTP contract.

A generated TypeScript client may be used by the mobile application to reduce contract drift.
